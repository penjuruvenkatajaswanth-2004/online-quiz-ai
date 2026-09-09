const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    quiz_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
        required: true
    },
    question: {
        type: String,
        required: true
    },
    option_a: {
        type: String,
        required: true
    },
    option_b: {
        type: String,
        required: true
    },
    option_c: {
        type: String,
        required: true
    },
    option_d: {
        type: String,
        required: true
    },
    correct_answer: {
        type: String,
        required: true,
        enum: ["A", "B", "C", "D"]
    }
}, {
    timestamps: true
});

questionSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Question", questionSchema);
