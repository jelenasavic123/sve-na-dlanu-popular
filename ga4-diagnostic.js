/* =========================================================
   SVE NA DLANU
   GA4 DAILY DIAGNOSTIC

   CILJ:
   Provera da li GA4 ZAISTA dobija nove preglede.

   NE MENJA:
   - posts.json
   - popular.json
   - GA4 podatke

   PROPERTY:
   549759235

   PROVERAVA:
   - poslednjih 7 dana
   - screenPageViews po danu
   - pagePathPlusQueryString po danu
   - ukupne preglede
   - top URL-ove
========================================================= */

const {
    BetaAnalyticsDataClient
} = require("@google-analytics/data");

const {
    GoogleAuth
} = require("google-auth-library");


/* =========================================================
   PODESAVANJA
========================================================= */

const PROPERTY_ID = "549759235";

const TIME_ZONE = "Europe/Belgrade";

const DAYS = 7;


/* =========================================================
   LOG
========================================================= */

function separator() {

    console.log(
        "======================================================"
    );

}


function section(title) {

    console.log("");
    separator();
    console.log(title);
    separator();

}


/* =========================================================
   MASK EMAIL
========================================================= */

function maskEmail(email) {

    if (!email) {
        return "(nema)";
    }

    const value = String(email);

    const parts = value.split("@");

    if (parts.length !== 2) {
        return "***";
    }

    const name = parts[0];

    const domain = parts[1];

    if (name.length <= 2) {
        return "***@" + domain;
    }

    return (
        name.substring(0, 2)
        + "***@"
        + domain
    );

}


/* =========================================================
   GOOGLE CREDENTIALS
========================================================= */

function getCredentials() {

    section(
        "1. GOOGLE SERVICE ACCOUNT"
    );

    const raw =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!raw) {

        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON"
        );

    }

    console.log(
        "Secret pronadjen"
    );

    console.log(
        "Duzina:",
        raw.length,
        "karaktera"
    );

    let credentials;

    try {

        credentials =
            JSON.parse(raw);

    }
    catch (error) {

        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON"
        );

    }

    if (
        !credentials.client_email
        ||
        !credentials.private_key
    ) {

        throw new Error(
            "Nedostaje client_email ili private_key"
        );

    }

    console.log(
        "Email:",
        maskEmail(
            credentials.client_email
        )
    );

    console.log(
        "Private key: OK"
    );

    return credentials;

}


/* =========================================================
   GOOGLE AUTH
========================================================= */

function createGoogleAuth(credentials) {

    section(
        "2. GOOGLE AUTH"
    );

    const auth =
        new GoogleAuth({

            credentials: {

                client_email:
                    credentials.client_email,

                private_key:
                    credentials.private_key

            },

            scopes: [

                "https://www.googleapis.com/auth/analytics.readonly"

            ]

        });

    console.log(
        "Google Auth kreiran"
    );

    return auth;

}


/* =========================================================
   GA4 CLIENT
========================================================= */

function createAnalyticsClient(credentials) {

    section(
        "3. GA4 CLIENT"
    );

    const analytics =
        new BetaAnalyticsDataClient({

            credentials: {

                client_email:
                    credentials.client_email,

                private_key:
                    credentials.private_key

            }

        });

    console.log(
        "GA4 Client kreiran"
    );

    return analytics;

}


/* =========================================================
   TEST PROPERTY
========================================================= */

async function testProperty(analytics) {

    section(
        "4. PROVERA GA4 PROPERTY"
    );

    console.log(
        "Property:",
        PROPERTY_ID
    );

    try {

        const [
            response
        ] =
        await analytics.runReport({

            property:
                `properties/${PROPERTY_ID}`,

            dateRanges: [

                {

                    startDate:
                        "7daysAgo",

                    endDate:
                        "yesterday"

                }

            ],

            metrics: [

                {

                    name:
                        "screenPageViews"

                }

            ]

        });

        let total = 0;

        if (
            response.rows
            &&
            response.rows.length
        ) {

            total =
                Number(
                    response.rows[0]
                    .metricValues[0]
                    .value
                );

        }

        console.log(
            "screenPageViews za period:",
            total
        );

        console.log(
            "GA4 Property radi."
        );

        return true;

    }
    catch (error) {

        console.error(
            "GA4 Property GRESKA:"
        );

        console.error(
            error.message
        );

        return false;

    }

}


/* =========================================================
   DAILY DATA
========================================================= */

async function getDailyData(analytics) {

    section(
        "5. SCREEN PAGE VIEWS PO DANIMA"
    );

    console.log(
        "Period: poslednjih 7 zavrsenih dana"
    );

    console.log(
        "Time zone:",
        TIME_ZONE
    );

    console.log("");

    try {

        const [
            response
        ] =
        await analytics.runReport({

            property:
                `properties/${PROPERTY_ID}`,

            dateRanges: [

                {

                    startDate:
                        "7daysAgo",

                    endDate:
                        "yesterday"

                }

            ],

            dimensions: [

                {

                    name:
                        "date"

                }

            ],

            metrics: [

                {

                    name:
                        "screenPageViews"

                },

                {

                    name:
                        "activeUsers"

                }

            ],

            orderBys: [

                {

                    dimension: {

                        dimensionName:
                            "date",

                        order:
                            "ASCENDING"

                    }

                }

            ]

        });

        const rows =
            response.rows || [];

        console.log(
            "Broj dana:",
            rows.length
        );

        console.log("");

        console.log(
            "DATE        VIEWS        USERS"
        );

        console.log(
            "--------------------------------"
        );

        let totalViews = 0;

        let totalUsers = 0;

        for (
            const row of rows
        ) {

            const date =
                row
                .dimensionValues[0]
                .value;

            const views =
                Number(
                    row
                    .metricValues[0]
                    .value
                );

            const users =
                Number(
                    row
                    .metricValues[1]
                    .value
                );

            totalViews += views;

            totalUsers += users;

            console.log(

                date.padEnd(12)
                +
                String(views)
                    .padEnd(13)
                +
                String(users)

            );

        }

        console.log(
            "--------------------------------"
        );

        console.log(
            "TOTAL VIEWS:",
            totalViews
        );

        console.log(
            "TOTAL USERS:",
            totalUsers
        );

        return rows;

    }
    catch (error) {

        console.error(
            "GRESKA kod dnevnog izvestaja:"
        );

        console.error(
            error.message
        );

        return [];

    }

}


/* =========================================================
   URL PO DANIMA
========================================================= */

async function getDailyURLs(analytics) {

    section(
        "6. URL + DATUM"
    );

    console.log(
        "Ovo proverava da li se novi URL-ovi pojavljuju."
    );

    console.log("");

    try {

        const [
            response
        ] =
        await analytics.runReport({

            property:
                `properties/${PROPERTY_ID}`,

            dateRanges: [

                {

                    startDate:
                        "7daysAgo",

                    endDate:
                        "yesterday"

                }

            ],

            dimensions: [

                {

                    name:
                        "date"

                },

                {

                    name:
                        "pagePathPlusQueryString"

                }

            ],

            metrics: [

                {

                    name:
                        "screenPageViews"

                }

            ],

            orderBys: [

                {

                    dimension: {

                        dimensionName:
                            "date",

                        order:
                            "DESCENDING"

                    }

                },

                {

                    metric: {

                        metricName:
                            "screenPageViews",

                        order:
                            "DESCENDING"

                    }

                }

            ],

            limit:
                1000

        });

        const rows =
            response.rows || [];

        console.log(
            "Ukupno redova:",
            rows.length
        );

        console.log("");

        let currentDate = "";

        let count = 0;

        for (
            const row of rows
        ) {

            const date =
                row
                .dimensionValues[0]
                .value;

            const path =
                row
                .dimensionValues[1]
                .value;

            const views =
                Number(
                    row
                    .metricValues[0]
                    .value
                );

            if (
                date !== currentDate
            ) {

                console.log("");
                console.log(
                    "--------------------------------"
                );
                console.log(
                    "DATUM:",
                    date
                );
                console.log(
                    "--------------------------------"
                );

                currentDate = date;

            }

            console.log(
                String(views)
                    .padEnd(8)
                +
                path
            );

            count++;

            if (count >= 200) {

                console.log("");
                console.log(
                    "... prikazano prvih 200 redova"
                );

                break;

            }

        }

        return rows;

    }
    catch (error) {

        console.error(
            "GRESKA kod URL izvestaja:"
        );

        console.error(
            error.message
        );

        return [];

    }

}


/* =========================================================
   TOP URL-OVI UKUPNO
========================================================= */

async function getTopURLs(analytics) {

    section(
        "7. TOP URL-OVI - POSLEDNJIH 7 DANA"
    );

    try {

        const [
            response
        ] =
        await analytics.runReport({

            property:
                `properties/${PROPERTY_ID}`,

            dateRanges: [

                {

                    startDate:
                        "7daysAgo",

                    endDate:
                        "yesterday"

                }

            ],

            dimensions: [

                {

                    name:
                        "pagePathPlusQueryString"

                }

            ],

            metrics: [

                {

                    name:
                        "screenPageViews"

                }

            ],

            orderBys: [

                {

                    metric: {

                        metricName:
                            "screenPageViews",

                        order:
                            "DESCENDING"

                    }

                }

            ],

            limit:
                50

        });

        const rows =
            response.rows || [];

        console.log(
            "TOP 50:"
        );

        console.log("");

        console.log(
            "#   Views       URL"
        );

        console.log(
            "-----------------------------------------------"
        );

        let index = 1;

        for (
            const row of rows
        ) {

            const path =
                row
                .dimensionValues[0]
                .value;

            const views =
                Number(
                    row
                    .metricValues[0]
                    .value
                );

            console.log(
                String(index)
                    .padEnd(4)
                +
                String(views)
                    .padEnd(12)
                +
                path
            );

            index++;

        }

        return rows;

    }
    catch (error) {

        console.error(
            "GRESKA kod TOP URL izvestaja:"
        );

        console.error(
            error.message
        );

        return [];

    }

}


/* =========================================================
   GLAVNI START
========================================================= */

async function start() {

    try {

        section(
            "SVE NA DLANU - GA4 DAILY DIAGNOSTIC"
        );

        console.log(
            "Property:",
            PROPERTY_ID
        );

        console.log(
            "Danas:",
            new Date()
                .toISOString()
        );

        console.log("");

        /* -----------------------------------------------
           CREDENTIALS
        ------------------------------------------------ */

        const credentials =
            getCredentials();

        /* -----------------------------------------------
           AUTH
        ------------------------------------------------ */

        const auth =
            createGoogleAuth(
                credentials
            );

        await auth.getClient();

        console.log(
            "Google Auth OK"
        );

        /* -----------------------------------------------
           CLIENT
        ------------------------------------------------ */

        const analytics =
            createAnalyticsClient(
                credentials
            );

        /* -----------------------------------------------
           PROPERTY
        ------------------------------------------------ */

        const propertyOK =
            await testProperty(
                analytics
            );

        if (!propertyOK) {

            throw new Error(
                "GA4 Property nije dostupan."
            );

        }

        /* -----------------------------------------------
           DAILY
        ------------------------------------------------ */

        const daily =
            await getDailyData(
                analytics
            );

        /* -----------------------------------------------
           URL + DATE
        ------------------------------------------------ */

        await getDailyURLs(
            analytics
        );

        /* -----------------------------------------------
           TOP URL
        ------------------------------------------------ */

        await getTopURLs(
            analytics
        );

        /* -----------------------------------------------
           ZAKLJUCAK
        ------------------------------------------------ */

        section(
            "8. ZAKLJUCAK"
        );

        if (!daily.length) {

            console.log(
                "❌ GA4 nije vratio dnevne podatke."
            );

        }
        else {

            console.log(
                "✅ GA4 vraca dnevne podatke."
            );

            console.log("");

            console.log(
                "Ako su VIEW vrednosti razlicite po danima,"
            );

            console.log(
                "GA4 normalno belezi posete."
            );

            console.log("");

            console.log(
                "Ako su 4+ dana identicne,"
            );

            console.log(
                "onda dalje proveravamo GA4 tracking,"
            );

            console.log(
                "a ne popular.js."
            );

        }

        section(
            "DIJAGNOSTIKA ZAVRSENA"
        );

    }
    catch (error) {

        console.error("");

        console.error(
            "❌ KRITICNA GRESKA"
        );

        console.error(
            error.message
        );

        process.exit(1);

    }

}


/* =========================================================
   RUN
========================================================= */

start();