/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   POSTS.JSON SE UCITAVA ONLINE:

   https://nadlanu.online/posts.json

   FORMAT:

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

const POSTS_URL =
    "https://nadlanu.online/posts.json";

const OUTPUT_FILE =
    path.join(
        __dirname,
        "popular.json"
    );

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
   UCITAVANJE POSTS.JSON SA SAJTA
========================================================= */

async function loadPosts() {

    section(
        "1. UCITAVANJE posts.json"
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
                        "User-Agent":
                            "Sve-na-dlanu-Popular/1.0"
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
                "posts.json mora biti JSON niz []."
            );

        }


        console.log(
            "✅ posts.json uspesno ucitan."
        );


        console.log(
            "Ukupno serija:",
            data.length
        );


        if (data.length === 0) {

            throw new Error(
                "posts.json je prazan."
            );

        }


        return data;


    } catch (error) {

        console.error(
            "❌ Greska pri ucitavanju posts.json:"
        );

        console.error(
            error.message
        );

        throw error;

    }

}


/* =========================================================
   KREIRANJE SETA VALIDNIH ID-EVA
========================================================= */

function createSeriesIdSet(posts) {

    const set =
        new Set();


    posts.forEach(
        function(post) {

            if (!post || typeof post !== "object") {

                return;

            }


            const id =
                String(
                    post.id || ""
                )
                .trim()
                .toLowerCase();


            if (!id) {

                return;

            }


            set.add(id);

        }
    );


    console.log(
        "Validnih ID-eva serija:",
        set.size
    );


    return set;

}


/* =========================================================
   GOOGLE CREDENTIALS
========================================================= */

function getCredentials() {

    section(
        "2. GOOGLE SERVICE ACCOUNT"
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


    let credentials;


    try {

        credentials =
            JSON.parse(json);

    } catch (error) {

        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON."
        );

    }


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


    return credentials;

}


/* =========================================================
   GOOGLE AUTH
========================================================= */

function createGoogleAuth(credentials) {

    section(
        "3. GOOGLE AUTH"
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
        "✅ GoogleAuth napravljen."
    );


    return auth;

}


/* =========================================================
   TEST AUTH
========================================================= */

async function testGoogleAuthentication(auth) {

    section(
        "4. GOOGLE OAUTH TOKEN"
    );


    try {

        const client =
            await auth.getClient();


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
            "❌ OAuth greska:",
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
        "5. GA4 DATA API CLIENT"
    );


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

}


/* =========================================================
   NORMALIZACIJA ID
========================================================= */

function normalizeId(value) {

    if (!value) {

        return "";

    }


    let result =
        String(value)
        .trim()
        .toLowerCase();


    /*
     * Ukloni pocetne /
     */

    result =
        result.replace(
            /^\/+/,
            ""
        );


    /*
     * Ukloni zavrsne /
     */

    result =
        result.replace(
            /\/+$/,
            ""
        );


    /*
     * Ako je URL
     */

    try {

        if (
            result.startsWith("http://") ||
            result.startsWith("https://")
        ) {

            const url =
                new URL(result);

            result =
                url.pathname;

            result =
                result.replace(
                    /^\/+/,
                    ""
                );

            result =
                result.replace(
                    /\/+$/,
                    ""
                );

        }

    } catch (error) {

        // nije URL

    }


    /*
     * Query string
     */

    const question =
        result.indexOf("?");


    if (question !== -1) {

        result =
            result.substring(
                0,
                question
            );

    }


    /*
     * Hash
     */

    const hash =
        result.indexOf("#");


    if (hash !== -1) {

        result =
            result.substring(
                0,
                hash
            );

    }


    /*
     * index.html
     */

    result =
        result.replace(
            /\/index\.html$/i,
            ""
        );


    /*
     * .html
     */

    result =
        result.replace(
            /\.html$/i,
            ""
        );


    /*
     * Ako ima vise delova,
     * uzimamo poslednji.
     *
     * /series/ayse
     *
     * -> ayse
     */

    const parts =
        result
            .split("/")
            .filter(Boolean);


    if (!parts.length) {

        return "";

    }


    result =
        parts[
            parts.length - 1
        ];


    return String(
        result
    )
    .trim()
    .toLowerCase();

}


/* =========================================================
   PRETVORI PAGE PATH U SERIJSKI ID
========================================================= */

function convertPageToId(pagePath) {

    if (!pagePath) {

        return "";

    }


    return normalizeId(
        pagePath
    );

}


/* =========================================================
   DA LI JE VALIDAN ID
========================================================= */

function isValidSeriesId(
    id,
    seriesIdSet
) {

    if (!id) {

        return false;

    }


    const normalized =
        normalizeId(id);


    if (!normalized) {

        return false;

    }


    /*
     * NAJVAZNIJA PROVERA
     *
     * ID MORA POSTOJATI U posts.json
     */

    if (
        !seriesIdSet.has(
            normalized
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   GA4 PERIOD
========================================================= */

async function getPeriodData(

    analyticsDataClient,

    nazivPerioda,

    startDate,

    endDate,

    seriesIdSet

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

                limit:
                    10000

            });


        const rows =
            response.rows || [];


        console.log(
            "GA4 redova:",
            rows.length
        );


        const map =
            new Map();


        let validRows = 0;

        let ignoredRows = 0;


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


                if (views <= 0) {

                    return;

                }


                const id =
                    convertPageToId(
                        pagePath
                    );


                /*
                 * SAMO ID KOJI POSTOJI
                 * U posts.json
                 */

                if (
                    !isValidSeriesId(
                        id,
                        seriesIdSet
                    )
                ) {

                    ignoredRows++;

                    return;

                }


                validRows++;


                const old =
                    map.get(id);


                if (old) {

                    old.views += views;

                } else {

                    map.set(

                        id,

                        {

                            id:
                                id,

                            views:
                                views

                        }

                    );

                }

            }

        );


        const result =
            Array.from(
                map.values()
            );


        result.sort(

            function(a, b) {

                return (
                    Number(b.views) -
                    Number(a.views)
                );

            }

        );


        console.log(
            "Validnih GA4 redova:",
            validRows
        );


        console.log(
            "Ignorisanih redova:",
            ignoredRows
        );


        console.log(
            "Pronadjeno serija:",
            result.length
        );


        if (result.length > 0) {

            console.log("");

            console.log(
                "TOP SERIJE:"
            );


            result
                .slice(
                    0,
                    TOP_LIMIT
                )
                .forEach(

                    function(item, index) {

                        console.log(
                            `${index + 1}. ${item.id} - ${item.views} pregleda`
                        );

                    }

                );

        } else {

            console.log(
                "⚠️ Nema odgovarajucih serija za ovaj period."
            );

        }


        return result;


    } catch (error) {

        console.error("");

        console.error(
            "❌ GA4 greska:",
            nazivPerioda
        );

        console.error(
            "Code:",
            error.code || "n/a"
        );

        console.error(
            "Message:",
            error.message
        );

        throw error;

    }

}


/* =========================================================
   TOP 10
========================================================= */

function getTop(data) {

    return data
        .sort(

            function(a, b) {

                return (
                    Number(b.views) -
                    Number(a.views)
                );

            }

        )
        .slice(
            0,
            TOP_LIMIT
        );

}


/* =========================================================
   PRINT
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
   NAPRAVI JSON
========================================================= */

function createPopularJSON(

    popularDanas,

    popular30Dana,

    popularOduvek

) {

    section(
        "8. PRAVLJENJE popular.json"
    );


    const output = {

        today:
            getTop(
                popularDanas
            ),

        last30Days:
            getTop(
                popular30Dana
            ),

        allTime:
            getTop(
                popularOduvek
            )

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


    console.log("");

    console.log(
        "✅ popular.json napravljen."
    );


    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );


    printTop(
        "TOP 10 - TODAY",
        output.today
    );


    printTop(
        "TOP 10 - LAST 30 DAYS",
        output.last30Days
    );


    printTop(
        "TOP 10 - ALL TIME",
        output.allTime
    );


    return output;

}


/* =========================================================
   VALIDACIJA
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
   GLAVNI PROGRAM
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
        "Posts:",
        POSTS_URL
    );


    try {

        /* =================================================
           1. POSTS.JSON
        ================================================= */

        const posts =
            await loadPosts();


        /* =================================================
           2. ID-EVI SERIJA
        ================================================= */

        section(
            "2. UCITAVANJE ID-EVA SERIJA"
        );


        const seriesIdSet =
            createSeriesIdSet(
                posts
            );


        if (
            seriesIdSet.size === 0
        ) {

            throw new Error(
                "Nijedan validan ID serije nije pronadjen u posts.json."
            );

        }


        /* =================================================
           3. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* =================================================
           4. AUTH
        ================================================= */

        const auth =
            createGoogleAuth(
                credentials
            );


        /* =================================================
           5. TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );


        /* =================================================
           6. GA4 CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );


        /* =================================================
           7. TODAY
        ================================================= */

        section(
            "7A. TODAY"
        );


        const danas =
            await getPeriodData(

                analyticsDataClient,

                "Danas",

                "today",

                "today",

                seriesIdSet

            );


        /* =================================================
           8. LAST 30 DAYS
        ================================================= */

        section(
            "7B. LAST 30 DAYS"
        );


        const poslednjih30 =
            await getPeriodData(

                analyticsDataClient,

                "Poslednjih 30 dana",

                "30daysAgo",

                "yesterday",

                seriesIdSet

            );


        /* =================================================
           9. ALL TIME
        ================================================= */

        section(
            "7C. ALL TIME"
        );


        const oduvek =
            await getPeriodData(

                analyticsDataClient,

                "Sve vreme",

                ALL_TIME_START_DATE,

                "today",

                seriesIdSet

            );


        /* =================================================
           10. JSON
        ================================================= */

        createPopularJSON(

            danas,

            poslednjih30,

            oduvek

        );


        /* =================================================
           11. VALIDACIJA
        ================================================= */

        const finalData =
            {

                today:
                    getTop(
                        danas
                    ),

                last30Days:
                    getTop(
                        poslednjih30
                    ),

                allTime:
                    getTop(
                        oduvek
                    )

            };


        validatePopularJSON(
            finalData
        );


        /* =================================================
           SUCCESS
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );


        console.log(
            "✅ posts.json ucitan online"
        );


        console.log(
            "✅ ID-evi serija pronadjeni"
        );


        console.log(
            "✅ Google Service Account"
        );


        console.log(
            "✅ Google Auth"
        );


        console.log(
            "✅ GA4 Data API"
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
            "✅ Epizode ignorisane"
        );


        console.log(
            "✅ Samo postojece serije"
        );


        console.log(
            "✅ popular.json"
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
