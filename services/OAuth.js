import { promisify } from "util";
import { google } from "googleapis";
import SecretManager from "./SecretManager.js";
import { readFile } from "fs/promises";

const oathCredentials = JSON.parse(
    await readFile(new URL("../keys/credentials.json", import.meta.url))
);

class OAuth {
    constructor() {
        const { client_secret, client_id, redirect_uris } = oathCredentials.web;
        this.SCOPES = [
            "https://www.googleapis.com/auth/gmail.send",
            "https://mail.google.com/",
        ];
        this.secretmanager = new SecretManager();
        this.google = google;
        this.oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[1]
        );
        this.auth;
    }

    generateUrl() {
        const options = {
            access_type: "offline",
            scope: this.SCOPES,
        };
        const authUrl = this.oAuth2Client.generateAuthUrl(options);
        return authUrl;
    }

    async generateToken(code) {
        try {
            let token = await promisify(
                this.oAuth2Client.getToken.bind(this.oAuth2Client)
            )(code);
            const response = await this.secretmanager.writeToken(token);
            console.log(
                `Token has been stored in secret manager as ${response.name}`
            );
            return token;
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    }
}

export default OAuth;
