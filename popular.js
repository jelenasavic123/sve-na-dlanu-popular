/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   IZLAZ:

   {
       "today": [
           {
               "id": "ayse",
               "views": 1520
           }
       ],

       "last30Days": [
           {
               "id": "ayse",
               "views": 24580
           }
       ],

       "allTime": [
           {
               "id": "ayse",
               "views": 135240
           }
       ]
   }

========================================================= */

const fs = require("fs");
const path = require("path");

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

const TOP_LIMIT = 10;

const OUTPUT_FILE = path.join(
    __dirname,
    "popular.json"
);

const TIME_ZONE = "Europe/Belgrade";

const ALL_TIME_START_DATE = "2020-01-01";


/* =========================================================
   LOG
========================================================= */

function separator() {

    console.log(
        "=========================================="
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
        name.substring(0, 2) +
        "***@" +
        domain
    );

}


/* =========================================================
   CREDENTIALS
========================================================= */

function getCredentials() {

    section(
        "1. GOOGLE SERVICE ACCOUNT"
    );

    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;


    if (!json) {

        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON secret."
        );

    }


    console.log(
        "GOOGLE_SERVICE_ACCOUNT_JSON postoji."
    );


    console.log(
        "Duzina:",
        json.length,
        "karaktera"
    );


    let credentials;


    try {

        credentials =
            JSON.parse(json);

    } catch (error) {

        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON."
        );

    }


    console.log(
        "JSON je validan."
    );


    if (!credentials.client_email) {

        throw new Error(
            "client_email ne postoji."
        );

    }


    if (!credentials.private_key) {

        throw new Error(
            "private_key ne postoji."
        );

    }


    console.log(
        "client_email:",
        maskEmail(
            credentials.client_email
        )
    );


    console.log(
        "private_key postoji: DA"
    );


    const privateKey =
        String(
            credentials.private_key
        );


    if (
        !privateKey.includes(
            "BEGIN PRIVATE KEY"
        )
    ) {

        throw new Error(
            "private_key nema BEGIN PRIVATE KEY."
        );

    }


    if (
        !privateKey.includes(
            "END PRIVATE KEY"
        )
    ) {

        throw new Error(
            "private_key nema END PRIVATE KEY."
        );

    }


    console.log(
        "Private key PEM format OK."
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


    try {

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
            "GoogleAuth napravljen."
        );


        return auth;


    } catch (error) {

        throw new Error(
            "GoogleAuth greska: " +
            error.message
        );

    }

}


/* =========================================================
   OAUTH TOKEN
========================================================= */

async function testGoogleAuthentication(auth) {

    section(
        "3. GOOGLE OAUTH TOKEN"
    );


    try {

        const client =
            await auth.getClient();


        if (!client) {

            throw new Error(
                "Google Auth client nije napravljen."
            );

        }


        const tokenResponse =
            await client.getAccessToken();


        if (
            !tokenResponse ||
            !tokenResponse.token
        ) {

            throw new Error(
                "OAuth token nije dobijen."
            );

        }


        console.log(
            "OAuth token uspesno dobijen."
        );


        return client;


    } catch (error) {

        console.error(
            "OAuth greska:",
            error.message
        );


        throw error;

    }

}


/* =========================================================
   GA4 CLIENT
========================================================= */

function createAnalyticsClient(credentials) {

    section(
        "4. GA4 DATA API CLIENT"
    );


    try {

        const client =
            new BetaAnalyticsDataClient({

                credentials: {

                    client_email:
                        credentials.client_email,

                    private_key:
                        credentials.private_key

                }

            });


        console.log(
            "GA4 client napravljen."
        );


        console.log(
            "Property:",
            PROPERTY_ID
        );


        return client;


    } catch (error) {

        throw new Error(
            "GA4 client greska: " +
            error.message
        );

    }

}


/* =========================================================
   PROVERA PROPERTY
========================================================= */

async function testGA4Property(
    analyticsDataClient
) {

    section(
        "5. PROVERA GA4 PROPERTY"
    );


    try {

        const [
            response
        ] =
            await analyticsDataClient.runReport({

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
                            "pagePath"
                    }

                ],

                metrics: [

                    {
                        name:
                            "screenPageViews"
                    }

                ],

                limit:
                    1

            });


        console.log(
            "GA4 Property pristup OK."
        );


        console.log(
            "Test redova:",
            (response.rows || []).length
        );


        return true;


    } catch (error) {

        console.error(
            "GA4 Property greska."
        );


        console.error(
            "Code:",
            error.code
        );


        console.error(
            "Message:",
            error.message
        );


        throw error;

    }

}


/* =========================================================
   PAGE PATH -> ID
========================================================= */

function convertPageToId(pagePath) {

    if (!pagePath) {

        return "";

    }


    let value =
        String(
            pagePath
        ).trim();


    /* -----------------------------------------
       AKO JE CEO URL
    ----------------------------------------- */

    try {

        if (
            value.startsWith("http://") ||
            value.startsWith("https://")
        ) {

            const url =
                new URL(value);


            value =
                url.pathname +
                url.search;

        }

    } catch (error) {

        // Nije URL
    }


    /* -----------------------------------------
       QUERY
    ----------------------------------------- */

    const questionIndex =
        value.indexOf("?");


    if (questionIndex !== -1) {

        const query =
            value.substring(
                questionIndex + 1
            );


        try {

            const params =
                new URLSearchParams(
                    query
                );


            const id =
                params.get("id");


            if (id) {

                return String(
                    id
                ).trim();

            }

        } catch (error) {

            // Nastavljamo dalje
        }


        value =
            value.substring(
                0,
                questionIndex
            );

    }


    /* -----------------------------------------
       HASH
    ----------------------------------------- */

    const hashIndex =
        value.indexOf("#");


    if (hashIndex !== -1) {

        value =
            value.substring(
                0,
                hashIndex
            );

    }


    /* -----------------------------------------
       UKLONI /
    ----------------------------------------- */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /* -----------------------------------------
       INDEX.HTML
    ----------------------------------------- */

    value =
        value.replace(
            /\/index\.html$/i,
            ""
        );


    /* -----------------------------------------
       .HTML
    ----------------------------------------- */

    value =
        value.replace(
            /\.html$/i,
            ""
        );


    /* -----------------------------------------
       DEL0VI PUTANJE
    ----------------------------------------- */

    const parts =
        value
            .split("/")
            .filter(Boolean);


    if (!parts.length) {

        return "";

    }


    /* -----------------------------------------
       UZMI POSLEDNJI DEO
    ----------------------------------------- */

    value =
        parts[
            parts.length - 1
        ];


    return String(
        value
    ).trim();

}


/* =========================================================
   VALIDAN ID SERIJE
========================================================= */

function isValidSeriesId(id) {

    if (!id) {

        return false;

    }


    const value =
        String(
            id
        )
        .trim()
        .toLowerCase();


    if (!value) {

        return false;

    }


    /* -----------------------------------------
       STRANICE KOJE NE ZELIMO
    ----------------------------------------- */

    const forbidden = [

        "index",
        "index.html",
        "series",
        "home",
        "search",
        "popular",
        "about",
        "login",
        "404",
        "404.html"

    ];


    if (
        forbidden.includes(
            value
        )
    ) {

        return false;

    }


    /* -----------------------------------------
       FAJLOVI KOJE NE ZELIMO
    ----------------------------------------- */

    const forbiddenExtensions = [

        ".css",
        ".js",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".svg",
        ".ico",
        ".json",
        ".xml",
        ".txt",
        ".woff",
        ".woff2",
        ".ttf",
        ".mp4",
        ".m3u8",
        ".map"

    ];


    for (
        const extension
        of forbiddenExtensions
    ) {

        if (
            value.endsWith(
                extension
            )
        ) {

            return false;

        }

    }


    return true;

}


/* =========================================================
   UCITAJ GA4 PERIOD
========================================================= */

async function getPeriodData(

    analyticsDataClient,

    nazivPerioda,

    startDate,

    endDate

) {

    console.log("");

    console.log(
        "------------------------------------------"
    );

    console.log(
        nazivPerioda
    );

    console.log(
        "Period:",
        startDate,
        "->",
        endDate
    );

    console.log(
        "------------------------------------------"
    );


    try {

        const [
            response
        ] =
            await analyticsDataClient.runReport({

                property:
                    `properties/${PROPERTY_ID}`,

                dateRanges: [

                    {

                        startDate:
                            startDate,

                        endDate:
                            endDate

                    }

                ],

                dimensions: [

                    {
                        name:
                            "pagePath"
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
                    10000

            });


        const rows =
            response.rows || [];


        console.log(
            "GA4 redova:",
            rows.length
        );


        const result = [];


        rows.forEach(

            function(row) {

                const pagePath =
                    row
                        .dimensionValues?.[0]
                        ?.value || "";


                const views =
                    Number(

                        row
                            .metricValues?.[0]
                            ?.value || 0

                    );


                const id =
                    convertPageToId(
                        pagePath
                    );


                /* -----------------------------------------
                   SAMO VALIDNE SERIJE
                ----------------------------------------- */

                if (
                    !isValidSeriesId(id)
                ) {

                    return;

                }


                if (
                    views <= 0
                ) {

                    return;

                }


                result.push({

                    id:
                        id,

                    visits:
                        views

                });

            }

        );


        console.log(
            "Validnih serija:",
            result.length
        );


        return result;


    } catch (error) {

        console.error(
            "Greska perioda:",
            nazivPerioda
        );


        console.error(
            "Code:",
            error.code
        );


        console.error(
            "Message:",
            error.message
        );


        throw error;

    }

}


/* =========================================================
   UKLANJANJE DUPLIKATA
========================================================= */

function removeDuplicates(data) {

    const map =
        new Map();


    if (!Array.isArray(data)) {

        return [];

    }


    data.forEach(

        function(item) {

            if (!item) {

                return;

            }


            const id =
                String(
                    item.id || ""
                ).trim();


            if (!isValidSeriesId(id)) {

                return;

            }


            const views =
                Number(
                    item.visits || 0
                );


            if (
                !Number.isFinite(views) ||
                views <= 0
            ) {

                return;

            }


            if (
                map.has(id)
            ) {

                map.get(id).visits += views;

            } else {

                map.set(

                    id,

                    {

                        id:
                            id,

                        visits:
                            views

                    }

                );

            }

        }

    );


    return Array.from(
        map.values()
    );

}


/* =========================================================
   TOP 10
========================================================= */

function getTop(data) {

    const unique =
        removeDuplicates(
            data
        );


    unique.sort(

        function(a, b) {

            return (
                Number(b.visits) -
                Number(a.visits)
            );

        }

    );


    return unique.slice(
        0,
        TOP_LIMIT
    );

}


/* =========================================================
   FORMAT ZA JSON
========================================================= */

function formatList(data) {

    if (!Array.isArray(data)) {

        return [];

    }


    return data.map(

        function(item) {

            return {

                id:
                    String(
                        item.id
                    ).trim(),

                views:
                    Number(
                        item.visits || 0
                    )

            };

        }

    );

}


/* =========================================================
   VALIDACIJA popular.json
========================================================= */

function validatePopularJSON(data) {

    section(
        "9. VALIDACIJA popular.json"
    );


    if (!data) {

        throw new Error(
            "popular.json je prazan."
        );

    }


    /* -----------------------------------------
       GLAVNI OBJEKAT
    ----------------------------------------- */

    if (
        typeof data !== "object" ||
        Array.isArray(data)
    ) {

        throw new Error(
            "popular.json mora biti objekat."
        );

    }


    const categories = [

        "today",
        "last30Days",
        "allTime"

    ];


    /* -----------------------------------------
       SVE 3 KATEGORIJE
    ----------------------------------------- */

    categories.forEach(

        function(category) {

            if (
                !Array.isArray(
                    data[category]
                )
            ) {

                throw new Error(
                    `${category} nije validan niz.`
                );

            }


            if (
                data[category].length >
                TOP_LIMIT
            ) {

                throw new Error(
                    `${category} ima vise od ${TOP_LIMIT} elemenata.`
                );

            }


            data[category].forEach(

                function(item, index) {

                    if (
                        !item ||
                        typeof item !== "object"
                    ) {

                        throw new Error(
                            `${category}[${index}] nije objekat.`
                        );

                    }


                    if (
                        typeof item.id !== "string" ||
                        !item.id.trim()
                    ) {

                        throw new Error(
                            `${category}[${index}] nema validan id.`
                        );

                    }


                    if (
                        typeof item.views !== "number" ||
                        !Number.isFinite(
                            item.views
                        ) ||
                        item.views < 0
                    ) {

                        throw new Error(
                            `${category}[${index}] nema validan views.`
                        );

                    }

                }

            );

        }

    );


    console.log(
        "today:",
        data.today.length
    );


    console.log(
        "last30Days:",
        data.last30Days.length
    );


    console.log(
        "allTime:",
        data.allTime.length
    );


    console.log(
        "popular.json validan."
    );


    return true;

}


/* =========================================================
   NAPRAVI popular.json
========================================================= */

function createPopularJSON(

    popularOduvek,

    popular30Dana,

    popularDanas

) {

    section(
        "8. PRAVLJENJE popular.json"
    );


    const output = {

        today:
            formatList(
                popularDanas
            ),

        last30Days:
            formatList(
                popular30Dana
            ),

        allTime:
            formatList(
                popularOduvek
            )

    };


    /* -----------------------------------------
       VALIDIRAJ PRE UPISA
    ----------------------------------------- */

    validatePopularJSON(
        output
    );


    /* -----------------------------------------
       SACUVAJ
    ----------------------------------------- */

    fs.writeFileSync(

        OUTPUT_FILE,

        JSON.stringify(
            output,
            null,
            4
        ),

        "utf8"

    );


    console.log("");

    console.log(
        "popular.json uspesno napravljen."
    );


    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );


    /* -----------------------------------------
       ISPIS
    ----------------------------------------- */

    printTop(
        "TOP 10 - TODAY",
        popularDanas
    );


    printTop(
        "TOP 10 - LAST 30 DAYS",
        popular30Dana
    );


    printTop(
        "TOP 10 - ALL TIME",
        popularOduvek
    );


    return output;

}


/* =========================================================
   PRINT TOP
========================================================= */

function printTop(

    title,

    data

) {

    console.log("");

    console.log(
        title
    );


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        console.log(
            "Nema podataka."
        );


        return;

    }


    data.forEach(

        function(item, index) {

            console.log(

                `${index + 1}. ${item.id} - ${item.visits} pregleda`

            );

        }

    );

}


/* =========================================================
   GLAVNA FUNKCIJA
========================================================= */

async function createPopularJSONProcess() {

    section(
        "SVE NA DLANU - GA4 POPULARNO"
    );


    console.log(
        "Property:",
        PROPERTY_ID
    );


    console.log(
        "Top limit:",
        TOP_LIMIT
    );


    console.log(
        "Timezone:",
        TIME_ZONE
    );


    try {

        /* =================================================
           1. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* =================================================
           2. AUTH
        ================================================= */

        const auth =
            createGoogleAuth(
                credentials
            );


        /* =================================================
           3. TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );


        /* =================================================
           4. GA4 CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );


        /* =================================================
           5. PROPERTY
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );


        /* =================================================
           6A. TODAY
        ================================================= */

        section(
            "6A. TODAY"
        );


        const danas =
            await getPeriodData(

                analyticsDataClient,

                "Danas",

                "today",

                "today"

            );


        /* =================================================
           6B. LAST 30 DAYS
        ================================================= */

        section(
            "6B. LAST 30 DAYS"
        );


        const poslednjih30 =
            await getPeriodData(

                analyticsDataClient,

                "Poslednjih 30 dana",

                "30daysAgo",

                "yesterday"

            );


        /* =================================================
           6C. ALL TIME
        ================================================= */

        section(
            "6C. ALL TIME"
        );


        const oduvek =
            await getPeriodData(

                analyticsDataClient,

                "Sve vreme",

                ALL_TIME_START_DATE,

                "today"

            );


        /* =================================================
           7. TOP LISTE
        ================================================= */

        section(
            "7. OBRADA TOP LISTA"
        );


        const popularnoDanas =
            getTop(
                danas
            );


        const popularno30Dana =
            getTop(
                poslednjih30
            );


        const popularnoOduvek =
            getTop(
                oduvek
            );


        console.log(
            "TODAY:",
            popularnoDanas.length
        );


        console.log(
            "LAST 30 DAYS:",
            popularno30Dana.length
        );


        console.log(
            "ALL TIME:",
            popularnoOduvek.length
        );


        /* =================================================
           8. NAPRAVI JSON
        ================================================= */

        createPopularJSON(

            popularnoOduvek,

            popularno30Dana,

            popularnoDanas

        );


        /* =================================================
           USPESNO
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );


        console.log(
            "Google Service Account OK"
        );


        console.log(
            "Google Auth OK"
        );


        console.log(
            "OAuth token OK"
        );


        console.log(
            "GA4 Data API OK"
        );


        console.log(
            "GA4 Property OK"
        );


        console.log(
            "Today OK"
        );


        console.log(
            "Last 30 Days OK"
        );


        console.log(
            "All Time OK"
        );


        console.log(
            "Filtriranje OK"
        );


        console.log(
            "Duplikati OK"
        );


        console.log(
            "TOP 10 OK"
        );


        console.log(
            "popular.json OK"
        );


        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "SVE JE USPESNO ZAVRSENO"
        );

        console.log(
            "=========================================="
        );


    } catch (error) {

        section(
            "GRESKA"
        );


        console.error(
            "popular.js NIJE USPESNO ZAVRSEN."
        );


        console.error(
            "Code:",
            error.code || "n/a"
        );


        console.error(
            "Message:",
            error.message || "n/a"
        );


        if (error.details) {

            console.error(
                "Details:",
                error.details
            );

        }


        console.error("");

        console.error(
            "=========================================="
        );


        console.error(
            "POPULAR.JS PREKIDA RAD."
        );


        console.error(
            "=========================================="
        );


        process.exit(1);

    }

}


/* =========================================================
   START
========================================================= */

createPopularJSONProcess();
