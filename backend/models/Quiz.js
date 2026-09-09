const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

quizSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Quiz", quizSchema);
