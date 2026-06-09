/* FELBIC OS — PlanIt Tasks Application Module */
import { aisd } from '../aisd-client.js';
import { VFS } from '../vfs.js';

export function initTasksApp() {
    console.log('[tasks-app] Initializing PlanIt...');

    let tasks = [];
    const TASKS_FILE = '/workspace/tasks.json';

    // UI Elements
    const taskInput = document.getElementById('tasks-add-input');
    const tasksListContainer = document.getElementById('tasks-list');
    const aiPrioritizeBtn = document.getElementById('tasks-ai-prioritize');
    const tasksCount = document.getElementById('tasks-inbox-count');

    async function loadTasks() {
        if (VFS.exists(TASKS_FILE)) {
            try {
                const content = VFS.readFile(TASKS_FILE);
                tasks = JSON.parse(content);
            } catch (e) {
                console.error("Failed to parse tasks file", e);
                tasks = [];
            }
        } else {
            tasks = [
                { id: Date.now(), text: "Finish design tokens for shell", completed: false, priority: "high" },
                { id: Date.now() + 1, text: "Update aisd-client documentation", completed: true, priority: "medium" },
                { id: Date.now() + 2, text: "Research Wayland protocols", completed: false, priority: "low" }
            ];
            saveTasks();
        }
        renderTasks();
    }

    function saveTasks() {
        VFS.writeFile(TASKS_FILE, JSON.stringify(tasks));
        if (tasksCount) {
            const pending = tasks.filter(t => !t.completed).length;
            tasksCount.textContent = pending > 0 ? pending : '';
        }
    }

    function renderTasks() {
        if (!tasksListContainer) return;
        tasksListContainer.innerHTML = '';
        
        tasks.sort((a, b) => {
            const pMap = { high: 0, medium: 1, low: 2 };
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return pMap[a.priority] - pMap[b.priority];
        });

        tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="task-checkbox ${task.completed ? 'checked' : ''}">
                    ${task.completed ? '<i class="hgi-stroke hgi-tick-01"></i>' : ''}
                </div>
                <div class="task-text">${task.text}</div>
                <div class="task-badge ${task.priority}">${task.priority}</div>
                <div class="task-delete"><i class="hgi-stroke hgi-delete-02"></i></div>
            `;

            // Toggle complete
            item.querySelector('.task-checkbox').addEventListener('click', () => {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            });

            // Delete
            item.querySelector('.task-delete').addEventListener('click', () => {
                tasks = tasks.filter(t => t.id !== task.id);
                saveTasks();
                renderTasks();
            });

            tasksListContainer.appendChild(item);
        });
    }

    async function prioritizeTasks() {
        if (tasks.length === 0) return;
        
        const originalBtnText = aiPrioritizeBtn.innerHTML;
        aiPrioritizeBtn.innerHTML = '<i class="hgi-stroke hgi-loading"></i> Optimizing...';
        aiPrioritizeBtn.disabled = true;

        try {
            const pendingTasks = tasks.filter(t => !t.completed).map(t => t.text).join('\n');
            const prompt = `Given these tasks, assign a priority (high, medium, or low) to each based on typical software engineering urgency. Return a JSON array of objects with "text" and "priority" keys.\n\nTasks:\n${pendingTasks}`;
            
            const response = await aisd.call('ai/chat', { 
                prompt: prompt,
                system: "You are a task prioritization expert. You only output valid JSON."
            });

            // Clean response (sometimes AI wraps in ```json ... ```)
            const jsonStr = response.replace(/```json|```/g, '').trim();
            const prioritized = JSON.parse(jsonStr);

            tasks.forEach(task => {
                if (!task.completed) {
                    const match = prioritized.find(p => p.text === task.text);
                    if (match) task.priority = match.priority;
                }
            });

            saveTasks();
            renderTasks();
            alert("AI has prioritized your day!");
        } catch (err) {
            console.error("AI Prioritization failed", err);
            alert("AI Prioritization failed. Please try again later.");
        } finally {
            aiPrioritizeBtn.innerHTML = originalBtnText;
            aiPrioritizeBtn.disabled = false;
        }
    }

    if (taskInput) {
        taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && taskInput.value.trim()) {
                const newTask = {
                    id: Date.now(),
                    text: taskInput.value.trim(),
                    completed: false,
                    priority: 'medium'
                };
                tasks.push(newTask);
                taskInput.value = '';
                saveTasks();
                renderTasks();
            }
        });
    }

    if (aiPrioritizeBtn) {
        aiPrioritizeBtn.addEventListener('click', prioritizeTasks);
    }

    loadTasks();
}
