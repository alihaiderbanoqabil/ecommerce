const users = require("../models/user.model");

const getUsers = () => {
    return users;
};

const getUserById = (id) => {
    return users.find((user) => user.id === Number(id));
};

const createUser = (body) => {
    // const { name, email } = body;
    // const newUser = {
    //     id: users.length + 1,
    //     name,
    //     email,
    // };
    const newUser = {
        id: users.length + 1,
        name: body.name,
        email: body.email,
    };

    users.push(newUser);

    return newUser;
};

const updateUser = (body) => {
    // const { name, email } = body;
    // const newUser = {
    //     id: users.length + 1,
    //     name,
    //     email,
    // };
    const newUser = {
        id: users.length + 1,
        name: body.name,
        email: body.email,
    };

    users.push(newUser);

    return newUser;
};

const deleteUser = (id) => {
    const index = users.findIndex(
        (user) => user.id === Number(id)
    );

    if (index === -1) return null;

    return users.splice(index, 1);
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    deleteUser,
};[0]