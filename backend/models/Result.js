const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    quiz_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    total_questions: {
        type: Number,
        required: true
    },
    answers: {
        type: Map,
        of: String,
        default: {}
    },
    submitted_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

resultSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Result", resultSchema);
