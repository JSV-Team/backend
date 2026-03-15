const asyncHandler = require('express-async-handler');
const matchingService = require('../services/matching.service');

const enableMatching = asyncHandler(async (req, res) => {
    const userId = req.body.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await matchingService.enable(userId);
    res.status(200).json({ message: 'Đã bật tính năng ghép đôi' });
});

const disableMatching = asyncHandler(async (req, res) => {
    const userId = req.body.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await matchingService.disable(userId);
    res.status(200).json({ message: 'Đã tắt tính năng ghép đôi' });
});

const getStatus = asyncHandler(async (req, res) => {
    const userId = req.query.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const status = await matchingService.getStatus(userId);
    res.status(200).json(status);
});

const findMatch = asyncHandler(async (req, res) => {
    const userId = req.body.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const matchCandidate = await matchingService.findMatch(userId);
        
        if (!matchCandidate) {
            return res.status(200).json({ message: 'Không tìm thấy người ghép đôi phù hợp lúc này' });
        }

        // Candidate found, try to create match session
        const session = await matchingService.createMatchSession(userId, matchCandidate.user_id);
        
        res.status(200).json({
            message: 'Ghép đôi thành công!',
            data: session
        });
    } catch (error) {
        // Return 400 for logic errors like already matched, matching disabled
        return res.status(400).json({ message: error.message });
    }
});

const endMatch = asyncHandler(async (req, res) => {
    const userId = req.body.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await matchingService.endMatch(userId);
    res.status(200).json({ message: 'Đã kết thúc cuộc ghép đôi hiện tại' });
});

module.exports = {
    enableMatching,
    disableMatching,
    getStatus,
    findMatch,
    endMatch
};
