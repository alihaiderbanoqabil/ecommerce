/**
 * Generic Query Service
 *
 * Supports: searching, filtering, sorting, pagination, and field limiting.
 * Works with any Mongoose model — pass the Model and req.query, get back
 * paginated data with metadata.
 *
 * ─── QUERY PARAMETERS ────────────────────────────────────────────────────────
 *
 * FILTERING
 *   ?status=active                         → equality filter
 *   ?price[gte]=100&price[lte]=500          → range filter ($gte, $lte, $gt, $lt, $ne)
 *   ?status[in]=pending,processing          → array inclusion ($in)
 *   ?status[nin]=cancelled,refunded         → array exclusion ($nin)
 *
 * SEARCHING
 *   ?search=laptop                          → searches across `searchFields` (regex)
 *                                             or falls back to MongoDB $text index
 *
 * SORTING
 *   ?sort=price                             → ascending by price
 *   ?sort=-price                            → descending by price
 *   ?sort=category,-price                   → multi-field sort
 *
 * PAGINATION
 *   ?page=2&limit=20
 *   ?pagination=false                       → poora dataset, bina paging ke
 *                                             (response ki shape wohi rehti hai)
 *
 * FIELD LIMITING
 *   ?fields=name,price,category             → include only these fields
 *   ?fields=-description,-images            → exclude these fields
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *
 *   const { queryService } = require('../utils/queryService');
 *
 *   const result = await queryService(Product, req.query, {
 *     searchFields: ['name', 'description'],       // regex search targets
 *     populate:     [{ path: 'category', select: 'name slug' }],
 *     baseFilter:   { isActive: true },            // always-on server-side filter
 *   });
 *
 *   return res.json({ message: '...', ...result });
 */

// Keys consumed by the query service — never treated as filter fields
const RESERVED_KEYS = new Set(['page', 'limit', 'sort', 'fields', 'search', 'searchFields', 'pagination']);

// Bracket-notation operators that may be promoted to their MongoDB $ equivalents
const OPERATORS = new Set(['gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin']);

/**
 * Sanitizes a plain object by removing any key that starts with '$'
 * to prevent NoSQL operator injection via user-supplied field names.
 */
const sanitizeKeys = (obj) => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;

    const safe = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue; // drop injected operator keys
        safe[key] = typeof value === 'object' ? sanitizeKeys(value) : value;
    }
    return safe;
};

/**
 * Converts raw query params into a Mongoose filter object.
 *
 * Bracket-notation operators (gt, gte, lt, lte, ne, in, nin) are promoted
 * to their MongoDB $ equivalents. All other params become equality filters.
 */
const buildFilter = (query, baseFilter = {}) => {
    const raw = { ...query };
    RESERVED_KEYS.forEach((k) => delete raw[k]);

    const filter = {};

    for (const [field, value] of Object.entries(raw)) {
        // Drop injected operator keys so ?$where=... never reaches the driver
        if (field.startsWith('$')) continue;

        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            filter[field] = value;
            continue;
        }

        const operators = Object.keys(value).filter((key) => OPERATORS.has(key));

        // No bracket operators → nested equality match: ?address[city]=Karachi
        if (operators.length === 0) {
            const safe = sanitizeKeys(value);
            // Everything was stripped as injection — drop the field rather than
            // handing Mongoose an empty object it cannot cast
            if (Object.keys(safe).length > 0) filter[field] = safe;
            continue;
        }

        // Promote known operators: { price: { gte: '100' } } → { price: { $gte: '100' } }
        const conditions = {};
        for (const op of operators) {
            const opValue = value[op];

            // Coerce in / nin string values to arrays: "a,b,c" → ["a","b","c"]
            conditions[`$${op}`] =
                (op === 'in' || op === 'nin') && typeof opValue === 'string'
                    ? opValue.split(',').map((s) => s.trim())
                    : opValue;
        }

        filter[field] = conditions;
    }

    return { ...baseFilter, ...filter };
};

/**
 * Builds a search condition.
 *
 * - If `searchFields` are provided → case-insensitive regex across those fields.
 * - Otherwise → MongoDB $text search (requires a text index on the model).
 */
const buildSearchCondition = (search, searchFields = []) => {
    if (!search) return {};

    // Escape special regex characters to prevent ReDoS
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (searchFields.length > 0) {
        return {
            $or: searchFields.map((field) => {
                return {
                    [field]: { $regex: escaped, $options: 'i' },
                }
            }),
        };
    }

    return { $text: { $search: search } };
};

/**
 * Main query service.
 *
 * @param {import('mongoose').Model} Model  - Any Mongoose model
 * @param {Object} query                    - req.query
 * @param {Object} [options]
 * @param {Object}   [options.baseFilter={}]       - Mandatory server-side filter (merged before user filters)
 * @param {string[]} [options.searchFields=[]]     - Fields to search with regex; uses $text if empty
 * @param {Array<{path:string, select?:string}>} [options.populate=[]] - Populate config
 * @param {number}   [options.defaultLimit=10]     - Default page size
 * @param {number}   [options.maxLimit=100]        - Hard cap on page size
 *
 * @returns {Promise<{ data: any[], pagination: Object }>}
 */
const queryService = async (Model, query = {}, options = {}) => {
    // console.log(query, "query");

    const {
        baseFilter = {},
        searchFields = [],
        populate = [],
        defaultLimit = 10,
        maxLimit = 100,
    } = options;

    // ── 1. Filter ────────────────────────────────────────────────────────────
    const filter = buildFilter(query, baseFilter);

    // ── 2. Search ────────────────────────────────────────────────────────────
    if (query.search) {
        const searchCondition = buildSearchCondition(query.search, searchFields);
        // console.log(searchCondition, "searchCondition");
        // Merge $or arrays if both filter and search produce them
        if (filter.$or && searchCondition.$or) {
            filter.$and = [{ $or: filter.$or }, { $or: searchCondition.$or }];
            delete filter.$or;
        } else {
            Object.assign(filter, searchCondition);
        }
    }

    // ── 3. Field limiting ────────────────────────────────────────────────────
    const fields = query.fields ? query.fields.split(',').join(' ') : '';

    // ── 4. Sorting ───────────────────────────────────────────────────────────
    const sort = query.sort ? query.sort.split(',').join(' ') : '-createdAt';

    // ── 5. Pagination ────────────────────────────────────────────────────────
    // Default ON. `?pagination=false` par poora dataset wapis aata hai — un
    // jagahon ke liye jahan page-by-page mangwana bemani hai (dropdowns,
    // export, "saari categories").
    //
    // Response ki shape dono soorat mein ek jaisi rehti hai (data + pagination),
    // taake client ko do alag shapes handle na karni parein. `paginated` flag
    // batata hai ke paging lagi thi ya nahi.
    const paginationEnabled = String(query.pagination).toLowerCase() !== 'false';

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    const skip = (page - 1) * limit;

    // ── 6. Execute ───────────────────────────────────────────────────────────
    let dbQuery = Model.find(filter).select(fields).sort(sort);

    if (paginationEnabled) {
        dbQuery = dbQuery.skip(skip).limit(limit);
    }

    for (const pop of populate) {
        dbQuery = dbQuery.populate(pop.path, pop.select ?? '');
    }

    const [data, total] = await Promise.all([dbQuery, Model.countDocuments(filter)]);

    if (!paginationEnabled) {
        return {
            data,
            pagination: {
                total,
                page: 1,
                limit: total,
                totalPages: total ? 1 : 0,
                hasNextPage: false,
                hasPrevPage: false,
                paginated: false,
            },
        };
    }

    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            paginated: true,
        },
    };
};

module.exports = { queryService, buildFilter, buildSearchCondition };