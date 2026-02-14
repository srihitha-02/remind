import { useState, useEffect } from "react";
import { Toaster } from "@/app/components/ui/sonner";
import { SignIn } from "@/app/components/SignIn";
import { Dashboard } from "@/app/components/Dashboard";
import { Task } from "@/app/types";
import { toast } from "sonner";

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    // Load theme - default to light mode
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Auto-login if token exists (optional, but good for persistence)
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchTasks(token);
    }
  }, []);

  const fetchTasks = async (token: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/tasks', {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const handleSignIn = (email: string) => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchTasks(token);
    }
  };

  const handleUpdateUser = (newName: string) => {
    if (user) {
      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const handleAddTask = async (task: Task) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        setTasks(prev => prev.filter(task => (task as any)._id !== id && task.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const taskToToggle = tasks.find(t => (t as any)._id === id || t.id === id);
    if (!taskToToggle) return;

    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ completed: !taskToToggle.completed })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? updatedTask : t));
        toast.success(updatedTask.completed ? "Task completed! 🎉" : "Task marked as pending");
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const token = localStorage.getItem('token');
    const id = (updatedTask as any)._id || updatedTask.id;
    if (!token || !id) return;

    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(updatedTask)
      });
      if (res.ok) {
        const savedTask = await res.json();
        setTasks(prev => prev.map(t => ((t as any)._id === id || t.id === id) ? savedTask : t));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (!user) {
    return (
      <>
        <SignIn onSignIn={handleSignIn} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <Dashboard
        userEmail={user.email}
        userName={user.name}
        tasks={tasks}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onToggleComplete={handleToggleComplete}
        onUpdateTask={handleUpdateTask}
        onUpdateUser={handleUpdateUser}
      />
      <Toaster position="top-center" richColors />
    </>
  );
}