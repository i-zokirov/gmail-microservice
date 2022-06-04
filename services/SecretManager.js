import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { readFile } from "fs/promises";
const secretManagerKey = JSON.parse(
    await readFile(new URL("../keys/secret-manager-key.json", import.meta.url))
);

class SecretManager {
    constructor() {
        this.client = new SecretManagerServiceClient({
            projectId: secretManagerKey.project_id,
            credentials: secretManagerKey,
        });
        this.parent = this.client.projectPath(secretManagerKey.project_id);
    }

    async createSecret(secretId) {
        try {
            const [secret] = await this.client.createSecret({
                parent: this.parent,
                secretId: secretId,
                secret: {
                    replication: {
                        automatic: {},
                    },
                },
            });

            return secret;
        } catch (error) {
            console.log(`ERROR ON CREATING SECRET: `, error);
            throw new Error(error);
        }
    }

    async getSecrets(filter) {
        try {
            const response = await this.client.listSecrets({
                parent: this.parent,
                filter,
            });
            return response[0];
        } catch (error) {
            console.log(`ERROR ON GETTING SECRETS: `, error);
            throw new Error(error);
        }
    }

    async addSecretVersion(secretName, payload) {
        try {
            const versionReq = {
                parent: secretName,
                payload: {
                    data: Buffer.from(JSON.stringify(payload), "utf8"),
                },
            };
            const [version] = await this.client.addSecretVersion(versionReq);
            return version;
        } catch (error) {
            console.log(`ERROR ON CREATING VERSION: `);
            console.log(error);
            throw new Error(error);
        }
    }

    async getSecretVersions(parent) {
        try {
            const [version] = await this.client.listSecretVersions({
                parent,
            });
            return version;
        } catch (error) {
            console.log(`ERROR ON GETTING VERSION: `);
            console.log(error);
            throw new Error(error);
        }
    }

    async accessVersion(versionName) {
        try {
            const [data] = await this.client.accessSecretVersion({
                name: versionName,
            });
            return data.payload.data.toString();
        } catch (error) {
            console.log(`ERROR ON ACCESSING VERSION: `);
            console.log(error);
            throw new Error(error);
        }
    }

    async destroyVersion() {
        try {
        } catch (error) {
            console.log(`ERROR ON DESTROYING VERSION: `);
            console.log(error);
            throw new Error(error);
        }
    }

    async getToken() {
        try {
            const [secret] = await this.getSecrets("name:gmailtoken");
            if (secret) {
                const versions = await this.getSecretVersions(secret.name);
                if (versions.length) {
                    const activeVersion = versions.filter(
                        (version) => version.state === "ENABLED"
                    );
                    const token = await this.accessVersion(
                        activeVersion[0].name
                    );
                    return token;
                } else {
                    throw new Error("No token");
                }
            } else {
                throw new Error("No secret created");
            }
        } catch (error) {
            console.log(`ERROR ON READING TOKEN: `);
            console.log(error);
            throw new Error(error);
        }
    }

    async writeToken(data) {
        try {
            const [secret] = await this.getSecrets("name:gmailtoken");
            if (secret) {
                const versions = await this.getSecretVersions(secret.name);
                if (versions.length) {
                    for (let version of versions) {
                        if (version.state !== "DESTROYED") {
                            await this.client.destroySecretVersion({
                                name: version.name,
                                etag: version.etag,
                            });
                        }
                    }
                }
                const newVersion = await this.addSecretVersion(
                    secret.name,
                    data
                );
                return newVersion;
            } else {
                const secret = await this.createSecret("gmailtoken");
                const newVersion = await this.addSecretVersion(
                    secret.name,
                    data
                );
                return newVersion;
            }
        } catch (error) {
            console.log(`ERROR ON WRITING TOKEN: `);
            console.log(error);
            throw new Error(error);
        }
    }
}

export default SecretManager;
