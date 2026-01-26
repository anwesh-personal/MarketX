import { Client as SSHClient } from 'ssh2';

/**
 * VPS File Manager
 * SFTP operations for uploading worker code to VPS
 */

export interface FileUpload {
    path: string;
    content: string;
    permissions?: string;
}

export class VPSFileManager {
    private sshConfig: {
        host: string;
        port: number;
        username: string;
        password: string;
    };

    constructor(config: { host: string; port: number; username: string; password: string }) {
        this.sshConfig = config;
    }

    /**
     * Upload multiple files via SFTP
     */
    async uploadFiles(files: FileUpload[]): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            const conn = new SSHClient();

            conn.on('ready', () => {
                conn.sftp(async (err, sftp) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, error: err.message });
                    }

                    try {
                        for (const file of files) {
                            await this.uploadFile(sftp, file);
                        }

                        conn.end();
                        resolve({ success: true });
                    } catch (uploadError: any) {
                        conn.end();
                        resolve({ success: false, error: uploadError.message });
                    }
                });
            });

            conn.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            conn.connect(this.sshConfig);
        });
    }

    /**
     * Upload single file
     */
    private uploadFile(sftp: any, file: FileUpload): Promise<void> {
        return new Promise((resolve, reject) => {
            const writeStream = sftp.createWriteStream(file.path);

            writeStream.on('close', () => {
                if (file.permissions) {
                    sftp.chmod(file.path, file.permissions, (err: any) => {
                        if (err) console.warn(`Failed to chmod ${file.path}:`, err);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });

            writeStream.on('error', (err: any) => {
                reject(err);
            });

            writeStream.write(file.content);
            writeStream.end();
        });
    }

    /**
     * Create directory on VPS
     */
    async createDirectory(path: string): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            const conn = new SSHClient();

            conn.on('ready', () => {
                conn.exec(`mkdir -p ${path}`, (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, error: err.message });
                    }

                    let errorOutput = '';

                    stream.on('close', () => {
                        conn.end();
                        if (errorOutput) {
                            resolve({ success: false, error: errorOutput });
                        } else {
                            resolve({ success: true });
                        }
                    });

                    stream.stderr.on('data', (data: Buffer) => {
                        errorOutput += data.toString();
                    });
                });
            });

            conn.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            conn.connect(this.sshConfig);
        });
    }

    /**
     * Execute command on VPS
     */
    async executeCommand(command: string): Promise<{
        success: boolean;
        output?: string;
        error?: string;
    }> {
        return new Promise((resolve) => {
            const conn = new SSHClient();
            let output = '';
            let errorOutput = '';

            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, error: err.message });
                    }

                    stream.on('close', () => {
                        conn.end();
                        resolve({
                            success: errorOutput.length === 0,
                            output: output.trim(),
                            error: errorOutput.trim() || undefined,
                        });
                    });

                    stream.on('data', (data: Buffer) => {
                        output += data.toString();
                    });

                    stream.stderr.on('data', (data: Buffer) => {
                        errorOutput += data.toString();
                    });
                });
            });

            conn.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            conn.connect(this.sshConfig);
        });
    }

    /**
     * Delete directory on VPS
     */
    async deleteDirectory(path: string): Promise<{ success: boolean; error?: string }> {
        return this.executeCommand(`rm -rf ${path}`);
    }
}
