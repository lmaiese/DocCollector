import { spawn } from 'child_process';
import fs from 'fs';

const child = spawn('npx', ['-y', 'tsx', 'server.ts'], {
  stdio: 'pipe',
  shell: true
});

const logStream = fs.createWriteStream('server-output.log');

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
  logStream.write(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
  logStream.write(`stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
  logStream.write(`exit code: ${code}\n`);
  logStream.end();
});
