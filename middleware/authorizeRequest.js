export default (req, res, next) => {
    const { auth } = req.query;
    if (auth === process.env.auth) {
        next();
    } else {
        throw new Error("Request Unauthorized!");
    }
};
