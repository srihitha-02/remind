const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

// @route   GET api/tasks
// @desc    Get all tasks for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
        });
        res.json(tasks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', auth, async (req, res) => {
    const { title, description, category, date, time, completed } = req.body;

    try {
        const task = await Task.create({
            userId: req.user.id,
            title,
            description,
            category,
            date,
            time,
            completed,
        });

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_CREATED',
            details: { taskId: task.id, title: task.title },
            ipAddress: req.ip
        });

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { title, description, category, date, time, completed } = req.body;

    try {
        let task = await Task.findByPk(req.params.id);

        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Make sure user owns task
        if (task.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Update fields
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (category !== undefined) task.category = category;
        if (date !== undefined) task.date = date;
        if (time !== undefined) task.time = time;
        if (completed !== undefined) task.completed = completed;

        await task.save();

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_UPDATED',
            details: { taskId: task.id, title: task.title },
            ipAddress: req.ip
        });

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let task = await Task.findByPk(req.params.id);

        if (!task) return res.status(404).json({ msg: 'Task not found' });

        // Make sure user owns task
        if (task.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const taskId = task.id;
        const taskTitle = task.title;
        await task.destroy();

        await ActivityLog.create({
            userId: req.user.id,
            action: 'TASK_DELETED',
            details: { taskId, title: taskTitle },
            ipAddress: req.ip
        });

        res.json({ msg: 'Task removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
