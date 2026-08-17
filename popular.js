/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   POSTS.JSON SE UCITAVA SA CLOUDFLARE-A:

   https://nadlanu.online/posts.json

   VAŽNO:
   - NE koristi lokalni posts.json
   - NE koristi episodes
   - NE koristi server1/server2/server3
   - NE prikazuje epizode
   - GA4 rezultati se proveravaju prema ID-jevima
     koji postoje u posts.json
   - pravi:
       today
       last30Days
       allTime

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

const POSTS_URL =
    "https://nadlanu.online/posts.json";

const TIME_ZONE =
    "Europe/Belgrade";

const ALL_TIME_START_DATE =
    "2020-01-01";


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

    const value =
        String(email);

    const parts =
        value.split("@");

    if (parts.length !== 2) {

        return "***";

    }

    const name =
        parts[0];

    const domain =
        parts[1];

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
   UCITAVANJE POSTS.JSON SA CLOUDFLARE-A
========================================================= */

async function loadPostsJSON() {

    section(
        "1. UCITAVANJE posts.json SA CLOUDFLARE-A"
    );

    console.log(
        "URL:",
        POSTS_URL
    );

    try {

        const response =
            await fetch(
                POSTS_URL,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status} ${response.statusText}`
            );

        }

        const data =
            await response.json();

        if (!Array.isArray(data)) {

            throw new Error(
                "posts.json nije niz."
            );

        }

        console.log(
            "✅ posts.json uspešno učitan."
        );

        console.log(
            "Ukupno serija:",
            data.length
        );

        return data;

    } catch (error) {

        console.error(
            "❌ Ne mogu da učitam posts.json."
        );

        console.error(
            "URL:",
            POSTS_URL
        );

        console.error(
            "Greška:",
            error.message
        );

        throw error;

    }

}


/* =========================================================
   KREIRAJ SET VALIDNIH ID-JEVA
========================================================= */

function createValidSeriesIds(posts) {

    section(
        "2. VALIDNI ID-JEVI SERIJA"
    );

    const ids =
        new Set();

    let invalid =
        0;

    posts.forEach(
        function(item) {

            if (
                !item ||
                typeof item !== "object"
            ) {

                invalid++;

                return;

            }

            const id =
                String(
                    item.id || ""
                )
                .trim()
                .toLowerCase();

            if (!id) {

                invalid++;

                return;

            }

            ids.add(id);

        }
    );

    console.log(
        "Validnih ID-jeva:",
        ids.size
    );

    console.log(
        "Nevalidnih stavki:",
        invalid
    );

    return ids;

}


/* =========================================================
   CREDENTIALS
========================================================= */

function getCredentials() {

    section(
        "3. GOOGLE SERVICE ACCOUNT"
    );

    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!json) {

        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON secret."
        );

    }

    console.log(
        "✅ GOOGLE_SERVICE_ACCOUNT_JSON postoji."
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
        "✅ JSON je validan."
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
        "✅ Private key PEM format OK."
    );

    return credentials;

}


/* =========================================================
   GOOGLE AUTH
========================================================= */

function createGoogleAuth(credentials) {

    section(
        "4. GOOGLE AUTH"
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
            "✅ GoogleAuth napravljen."
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
        "5. GOOGLE OAUTH TOKEN"
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
            "✅ OAuth token uspesno dobijen."
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
        "6. GA4 DATA API CLIENT"
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
            "✅ GA4 client napravljen."
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
   PROVERA GA4 PROPERTY
========================================================= */

async function testGA4Property(
    analyticsDataClient
) {

    section(
        "7. PROVERA GA4 PROPERTY"
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
            "✅ GA4 Property pristup OK."
        );

        console.log(
            "Test redova:",
            (response.rows || []).length
        );

        return true;

    } catch (error) {

        console.error(
            "❌ GA4 Property greska."
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
   PAGE PATH → ID
========================================================= */

function convertPageToId(pagePath) {

    if (!pagePath) {

        return "";

    }

    let value =
        String(
            pagePath
        ).trim();

    /*
     * Ako je pun URL
     */

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

        // Nastavi normalno
    }

    /*
     * Ukloni početni /
     */

    value =
        value.replace(
            /^\/+/,
            ""
        );

    /*
     * Query string
     */

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
                )
                .trim()
                .toLowerCase();

            }

        } catch (error) {

            // Nastavi
        }

        value =
            value.substring(
                0,
                questionIndex
            );

    }

    /*
     * Hash
     */

    const hashIndex =
        value.indexOf("#");

    if (hashIndex !== -1) {

        value =
            value.substring(
                0,
                hashIndex
            );

    }

    /*
     * index.html
     */

    value =
        value.replace(
            /\/index\.html$/i,
            ""
        );

    /*
     * .html
     */

    value =
        value.replace(
            /\.html$/i,
            ""
        );

    /*
     * Podela URL-a
     */

    const parts =
        value
            .split("/")
            .filter(Boolean);

    if (!parts.length) {

        return "";

    }

    /*
     * Uzimamo poslednji deo
     */

    value =
        parts[
            parts.length - 1
        ];

    /*
     * URL decode
     */

    try {

        value =
            decodeURIComponent(
                value
            );

    } catch (error) {

        // Nastavi
    }

    return String(
        value
    )
    .trim()
    .toLowerCase();

}


/* =========================================================
   PROVERA DA LI JE VALIDNA SERIJA
========================================================= */

function isValidSeriesId(
    id,
    validSeriesIds
) {

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

    /*
     * NAJVAŽNIJE:
     *
     * ID MORA POSTOJATI U posts.json
     */

    if (
        !validSeriesIds.has(
            value
        )
    ) {

        return false;

    }

    return true;

}


/* =========================================================
   UČITAJ GA4 PERIOD
========================================================= */

async function getPeriodData(

    analyticsDataClient,

    nazivPerioda,

    startDate,

    endDate,

    validSeriesIds

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
        "→",
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

        let ignored =
            0;

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

                if (
                    views <= 0
                ) {

                    return;

                }

                const id =
                    convertPageToId(
                        pagePath
                    );

                /*
                 * SAMO SERIJE KOJE POSTOJE
                 * U posts.json
                 */

                if (
                    !isValidSeriesId(
                        id,
                        validSeriesIds
                    )
                ) {

                    ignored++;

                    return;

                }

                result.push({

                    id:
                        id,

                    views:
                        views

                });

            }

        );

        console.log(
            "Validnih serija:",
            result.length
        );

        console.log(
            "Ignorisano:",
            ignored
        );

        return result;

    } catch (error) {

        console.error(
            "❌ Greska perioda:",
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

    data.forEach(

        function(item) {

            const id =
                String(
                    item.id || ""
                )
                .trim()
                .toLowerCase();

            if (!id) {

                return;

            }

            const views =
                Number(
                    item.views || 0
                );

            if (views <= 0) {

                return;

            }

            if (
                map.has(id)
            ) {

                map.set(

                    id,

                    map.get(id) +
                    views

                );

            } else {

                map.set(
                    id,
                    views
                );

            }

        }

    );

    return Array.from(
        map.entries()
    ).map(

        function([
            id,
            views
        ]) {

            return {

                id:
                    id,

                views:
                    views

            };

        }

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
                Number(b.views) -
                Number(a.views)
            );

        }

    );

    return unique.slice(
        0,
        TOP_LIMIT
    );

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

    if (!data.length) {

        console.log(
            "Nema podataka."
        );

        return;

    }

    data.forEach(

        function(item, index) {

            console.log(

                `${index + 1}. ${item.id} - ${item.views} pregleda`

            );

        }

    );

}


/* =========================================================
   VALIDACIJA popular.json
========================================================= */

function validatePopularJSON(data) {

    section(
        "11. VALIDACIJA popular.json"
    );

    if (!data) {

        throw new Error(
            "popular.json je prazan."
        );

    }

    const categories = [

        "today",
        "last30Days",
        "allTime"

    ];

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

                function(item) {

                    if (
                        !item ||
                        !item.id
                    ) {

                        throw new Error(
                            `${category} ima element bez id.`
                        );

                    }

                    if (
                        typeof item.views !==
                        "number"
                    ) {

                        throw new Error(
                            `${category} ${item.id} nema validan views.`
                        );

                    }

                }

            );

        }

    );

    console.log(
        "✅ today:",
        data.today.length
    );

    console.log(
        "✅ last30Days:",
        data.last30Days.length
    );

    console.log(
        "✅ allTime:",
        data.allTime.length
    );

    console.log(
        "✅ popular.json validan."
    );

    return true;

}


/* =========================================================
   NAPRAVI popular.json
========================================================= */

function createPopularJSON(

    popularnoOduvek,

    popularno30Dana,

    popularnoDanas

) {

    section(
        "10. PRAVLJENJE popular.json"
    );

    const output = {

        today:
            popularnoDanas,

        last30Days:
            popularno30Dana,

        allTime:
            popularnoOduvek

    };

    fs.writeFileSync(

        OUTPUT_FILE,

        JSON.stringify(
            output,
            null,
            4
        ),

        "utf8"

    );

    console.log(
        "✅ popular.json napravljen."
    );

    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );

    printTop(
        "TOP 10 - TODAY",
        popularnoDanas
    );

    printTop(
        "TOP 10 - LAST 30 DAYS",
        popularno30Dana
    );

    printTop(
        "TOP 10 - ALL TIME",
        popularnoOduvek
    );

    validatePopularJSON(
        output
    );

    return output;

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

    console.log(
        "Posts URL:",
        POSTS_URL
    );

    try {

        /* =================================================
           1. POSTS.JSON
        ================================================= */

        const posts =
            await loadPostsJSON();

        const validSeriesIds =
            createValidSeriesIds(
                posts
            );


        if (
            validSeriesIds.size === 0
        ) {

            throw new Error(
                "U posts.json nije pronađen nijedan validan ID serije."
            );

        }


        /* =================================================
           2. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* =================================================
           3. AUTH
        ================================================= */

        const auth =
            createGoogleAuth(
                credentials
            );


        /* =================================================
           4. TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );


        /* =================================================
           5. CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );


        /* =================================================
           6. PROPERTY
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );


        /* =================================================
           7A. TODAY
        ================================================= */

        section(
            "8A. TODAY"
        );

        const danas =
            await getPeriodData(

                analyticsDataClient,

                "Danas",

                "today",

                "today",

                validSeriesIds

            );


        /* =================================================
           7B. LAST 30 DAYS
        ================================================= */

        section(
            "8B. LAST 30 DAYS"
        );

        const poslednjih30 =
            await getPeriodData(

                analyticsDataClient,

                "Poslednjih 30 dana",

                "30daysAgo",

                "yesterday",

                validSeriesIds

            );


        /* =================================================
           7C. ALL TIME
        ================================================= */

        section(
            "8C. ALL TIME"
        );

        const oduvek =
            await getPeriodData(

                analyticsDataClient,

                "Sve vreme",

                ALL_TIME_START_DATE,

                "today",

                validSeriesIds

            );


        /* =================================================
           8. TOP LISTE
        ================================================= */

        section(
            "9. OBRADA TOP LISTA"
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
           9. JSON
        ================================================= */

        createPopularJSON(

            popularnoOduvek,

            popularno30Dana,

            popularnoDanas

        );


        /* =================================================
           SUCCESS
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );

        console.log(
            "✅ Cloudflare posts.json"
        );

        console.log(
            "✅ Validni ID-jevi serija"
        );

        console.log(
            "✅ Google Service Account"
        );

        console.log(
            "✅ Google Auth"
        );

        console.log(
            "✅ OAuth token"
        );

        console.log(
            "✅ GA4 Data API"
        );

        console.log(
            "✅ GA4 Property"
        );

        console.log(
            "✅ Today"
        );

        console.log(
            "✅ Last 30 Days"
        );

        console.log(
            "✅ All Time"
        );

        console.log(
            "✅ Filtriranje epizoda"
        );

        console.log(
            "✅ Duplikati"
        );

        console.log(
            "✅ TOP 10"
        );

        console.log(
            "✅ popular.json"
        );

        console.log("");

        separator();

        console.log(
            "SVE JE USPESNO ZAVRSENO"
        );

        separator();


    } catch (error) {

        section(
            "GRESKA"
        );

        console.error(
            "❌ popular.js NIJE USPESNO ZAVRSEN."
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

        separator();

        console.error(
            "POPULAR.JS PREKIDA RAD."
        );

        separator();

        process.exit(1);

    }

}


/* =========================================================
   START
========================================================= */

createPopularJSONProcess();
