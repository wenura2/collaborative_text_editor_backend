const ErrorHandler = require('../utils/ErrorHandler')
const catchAsyncErrors = require('./catchAsyncErrors')
const jwt = require("jsonwebtoken");

module.exports.isAuthenticated = catchAsyncErrors(async(req,res,next) => {

    const token = req.header('Authorization');

    if(!token){
        return next(new ErrorHandler("Please login to continue", 401));
    }

    jwt.verify(token.replace('Bearer ', ''), process.env.ACCESS_TOKEN_SECRET_KEY, (err, decoded) => {                                                        
        if (err) {
            console.log(err)  
            return next(new ErrorHandler("Please login to continue", 401));
        }
        req.user = decoded.user;  
        next();
    });

    
});

module.exports.isAdmin = (...roles) => {
    return (req,res,next) => {
        if(!roles.includes(req.user.role)){
            return next(new ErrorHandler(`${req.user.role} can not access this resources!`))
        };
        next();
    }
}
