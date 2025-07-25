import { Command } from 'commander';
import fs from 'fs';

const program = new Command();

program
  .description('Task 3.1 status updater')
  .action(() => {
    const tasksFile = './tasks/tasks.json';
    const rawData = fs.readFileSync(tasksFile, 'utf8');
    const tasks = JSON.parse(rawData);
    
    const task3 = tasks.tasks.find(task => task.id === '3');
    if (task3) {
      const subtask31 = task3.subtasks.find(subtask => subtask.id === '3.1');
      if (subtask31) {
        subtask31.status = 'done';
        subtask31.details += '

Implemented TechnicianScheduleManagement component with comprehensive features:
- Time-off request management system with approval workflow
- Calendar integration for visualizing schedules
- Database schema with technician_time_off table
- RLS policies for security
- Service methods for CRUD operations on scheduling data';
      }
      
      fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
      console.log('Successfully updated task 3.1 status to done');
    } else {
      console.error('Could not find task with ID 3');
    }
  });

program.parse(process.argv);
