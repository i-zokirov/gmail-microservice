import { readFile } from "fs/promises";
import { google } from "googleapis";
import SecretManager from "./SecretManager.js";

const oathCredentials = JSON.parse(
    await readFile(new URL("../keys/credentials.json", import.meta.url))
);

class Gmail {
    constructor() {
        const { client_secret, client_id, redirect_uris } = oathCredentials.web;

        this.google = google;
        this.secretmanager = new SecretManager();
        this.oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0]
        );

        this.auth;
        this.gmail;
    }

    async initialize() {
        this.auth = await this.authorize();
        this.gmail = this.google.gmail({ version: "v1", auth: this.auth });
    }

    async authorize() {
        try {
            const token = await this.secretmanager.getToken();
            this.oAuth2Client.setCredentials(JSON.parse(token));
            return this.oAuth2Client;
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    }

    async sendEmail(from, to, cc, bcc, messageObj) {
        const { subject, header, body, footer } = messageObj;
        const message = `
            <div style="padding:20px;max-width: 80%;">
                <h6>Hello!</h6>
                <br><br>
                <p>${header}</p>
                <br><br>
                ${body}
                <br><br>
                ${footer}
            </div>
        `;

        const draft = this.createEmailBody(from, to, cc, bcc, subject, message);
        const options = {
            auth: this.auth,
            userId: "me",
            resource: { raw: draft },
        };
        try {
            const response = await this.gmail.users.messages.send(options);
            console.log(response);
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    }

    createEmailBody(from, to, cc, bcc, subject, message) {
        const str = [
            'Content-Type: text/html; charset="UTF-8"\n',
            "MIME-Version: 1.0\n",
            "Content-Transfer-Encoding: 7bit\n",
            "to: ",
            to,
            "\n",
            "cc: ",
            cc,
            "\n",
            "bcc:",
            bcc,
            "\n",
            "from: ",
            from,
            "\n",
            "subject: ",
            subject,
            "\n\n",
            message,
        ].join("");

        const encodedMail = Buffer.from(str)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
        return encodedMail;
    }
}

export default Gmail;
