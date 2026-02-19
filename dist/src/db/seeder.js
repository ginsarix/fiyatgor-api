import "dotenv/config";
import { parseArgs } from "node:util";
import { hash as bcryptHash } from "bcrypt";
import { count, eq } from "drizzle-orm";
import { aesEncrypt } from "../utils/aes-256-gcm.js";
import { db } from "./index.js";
import { firmsTable } from "./schemas/firms.js";
import { usersTable } from "./schemas/users.js";
async function seedDemoFirm(redirectedByUserSeeder = false) {
    console.log("Started seeding demo firm...");
    if (!redirectedByUserSeeder) {
        const [demoCount] = await db
            .select({ count: count() })
            .from(firmsTable)
            .where(eq(firmsTable.diaServerCode, "diademo"));
        if (demoCount.count > 0) {
            console.log("Demo firm already seeded 🧘");
            return;
        }
    }
    const encryptedPwd = aesEncrypt("ws");
    const [{ firmId }] = await db
        .insert(firmsTable)
        .values({
        name: "DIA Demo",
        diaServerCode: "diademo",
        diaFirmCode: 34,
        diaUsername: "ws",
        diaPassword: encryptedPwd,
        diaApiKey: "", // demo user requires an empty string for the api key
    })
        .returning({ firmId: firmsTable.id });
    console.log("Successfully seeded Demo firm 🥳");
    return firmId;
}
async function seedDefaultAdminUser() {
    console.log("Started seeding users...");
    let firmId = null;
    const [firm] = await db
        .select({ firmId: firmsTable.id })
        .from(firmsTable)
        .where(eq(firmsTable.diaServerCode, "diademo"));
    if (firm) {
        const [defaultAdminCount] = await db
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.firmId, firm.firmId));
        if (defaultAdminCount.count > 0) {
            console.log("Default admin user is already seeded 🧘");
            return;
        }
        firmId = firm.firmId;
    }
    else {
        console.log("Demo firm not found, seeding it, ");
        firmId = (await seedDemoFirm(true));
    }
    const defaultAdminPwd = process.env.DEFAULT_ADMIN_PWD;
    if (!defaultAdminPwd) {
        console.error("Default admin password not found in environment");
        return;
    }
    const passwordHash = await bcryptHash(defaultAdminPwd, 12);
    await db.insert(usersTable).values([
        {
            name: "Default Admin",
            firmId,
            email: "cankomusdogan1@gmail.com",
            password: passwordHash,
            role: "superadmin",
        },
    ]);
    console.log("Successfully seeded default admin 🥳");
}
const options = {
    table: {
        type: "string",
        short: "t",
    },
};
const { values } = parseArgs({
    args: process.argv.slice(2),
    options,
});
const tableParamValue = values.table;
if (typeof tableParamValue === "string") {
    if (["firms", "firm"].includes(tableParamValue)) {
        await seedDemoFirm();
    }
    else if (["users", "user"].includes(tableParamValue)) {
        await seedDefaultAdminUser();
    }
    else {
        console.error(`${tableParamValue} is not an option`);
        process.exit(1);
    }
    process.exit(0);
}
else {
    console.error("value of table parameter is invalid");
    process.exit(1);
}
