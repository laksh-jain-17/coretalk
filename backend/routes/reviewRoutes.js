const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const authMiddleware = require("../middleware/authMiddleware");
router.post('/add',authMiddleware,async(req,res)=>{
    const {comment} = req.body;
    if(!comment)
    {
        return res.status(400).json({message : "Comment is required"});
    }
    try{
        const review = new Review({
            user: req.user.id,
            comment
        });
        await review.save();
        res.status(201).json({message:"Review submitted successfully"});
    }
    catch(err)
    {
        console.error(err);
        res.status(500).json({message:"Server error"});
    }
});
router.get('/',authMiddleware,async(req,res)=>{
    try
    {
        const reviews = (await Review.find().populate('user','name email')).toSorted({createdAt: -1});
        res.json(reviews);
    }
    catch(err)
    {
        console.error(err);
        res.status(500).json({message:"Server error"});
    }
});
module.exports = router;