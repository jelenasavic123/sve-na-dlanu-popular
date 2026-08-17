/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   AUTOMATSKO PRAVLJENJE popular.json

   VAŽNO:
   ---------------------------------------------------------
   posts.json je GLAVNI SPISAK SERIJA.

   popular.js:
   - učitava ID-jeve iz posts.json
   - čita GA4 podatke
   - pronalazi ID serije u GA4 putanji
   - IGNORIŠE epizode
   - IGNORIŠE player stranice
   - IGNORIŠE server stranice
   - IGNORIŠE sve što nije u posts.json
   - sabira preglede po seriji

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

const TIME_ZONE = "Europe/Belgrade";

const ALL_TIME_START_DATE = "2020-01-01";


/*
 * popular.js i posts.json treba da budu
 * u istom folderu.
 */

const POSTS_FILE = path.join(
    __dirname,
    "posts.json"
);


const OUTPUT_FILE = path.join(
    __dirname,
    "popular.json"
);


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
   NORMALIZACIJA ID-a
========================================================= */

function normalizeId(value) {

    if (value === null || value === undefined) {

        return "";

    }

    return String(value)
        .trim()
        .toLowerCase();

}


/* =========================================================
   UCITAJ posts.json
========================================================= */

function loadPosts() {

    section(
        "1. UCITAVANJE posts.json"
    );


    if (!fs.existsSync(POSTS_FILE)) {

        throw new Error(
            "Ne postoji posts.json: " +
            POSTS_FILE
        );

    }


    let data;


    try {

        const content =
            fs.readFileSync(
                POSTS_FILE,
                "utf8"
            );


        data =
            JSON.parse(
                content
            );


    } catch (error) {

        throw new Error(
            "posts.json nije validan JSON: " +
            error.message
        );

    }


    if (!Array.isArray(data)) {

        throw new Error(
            "posts.json mora biti niz [...]."
        );

    }


    console.log(
        "Pronadjeno stavki u posts.json:",
        data.length
    );


    /*
     * Set svih dozvoljenih ID-jeva.
     *
     * OVO JE NAJVAZNIJE.
     *
     * Ako ID ne postoji ovde,
     * NE MOZE uci u popular.json.
     */

    const validIds =
        new Set();


    const seriesById =
        new Map();


    data.forEach(
        function(item) {

            if (
                !item ||
                typeof item !== "object"
            ) {

                return;

            }


            const id =
                normalizeId(
                    item.id
                );


            if (!id) {

                return;

            }


            validIds.add(id);

            seriesById.set(
                id,
                item
            );

        }
    );


    console.log(
        "Validnih ID-jeva serija:",
        validIds.size
    );


    if (validIds.size === 0) {

        throw new Error(
            "posts.json nema nijedan validan ID serije."
        );

    }


    return {

        validIds:
            validIds,

        seriesById:
            seriesById

    };

}


/* =========================================================
   CREDENTIALS
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
        "3. GOOGLE AUTH"
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
        "4. GOOGLE OAUTH TOKEN"
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
        "5. GA4 DATA API CLIENT"
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
   TEST GA4 PROPERTY
========================================================= */

async function testGA4Property(
    analyticsDataClient
) {

    section(
        "6. PROVERA GA4 PROPERTY"
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
   PAGE PATH NORMALIZACIJA
========================================================= */

function cleanPagePath(pagePath) {

    if (!pagePath) {

        return "";

    }


    let value =
        String(pagePath)
        .trim();


    /*
     * Ako GA4 nekada vrati puni URL,
     * izvuci samo pathname.
     */

    try {

        if (
            value.startsWith("http://") ||
            value.startsWith("https://")
        ) {

            const url =
                new URL(value);

            value =
                url.pathname;

        }

    } catch (error) {

        // Nastavljamo dalje.
    }


    /*
     * Dekodiranje URL-a.
     */

    try {

        value =
            decodeURIComponent(
                value
            );

    } catch (error) {

        // Ako ne moze da se dekodira,
        // koristimo original.
    }


    /*
     * Mala slova.
     */

    value =
        value.toLowerCase();


    /*
     * Ukloni query string.
     */

    const questionIndex =
        value.indexOf("?");


    if (questionIndex !== -1) {

        value =
            value.substring(
                0,
                questionIndex
            );

    }


    /*
     * Ukloni hash.
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
     * Ukloni pocetni /.
     */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /*
     * Ukloni zavrsni /.
     */

    value =
        value.replace(
            /\/+$/,
            ""
        );


    return value;

}


/* =========================================================
   PROVERA DA LI JE SEGMENT EPIZODA
========================================================= */

function isEpisodeSegment(segment) {

    if (!segment) {

        return false;

    }


    const value =
        normalizeId(
            segment
        );


    /*
     * Direktne reci za epizodu.
     */

    const forbiddenWords = [

        "episode",
        "episodes",
        "epizoda",
        "epizode",

        "player",
        "watch",
        "video",

        "server1",
        "server2",
        "server3",

        "server-1",
        "server-2",
        "server-3",

        "vidply",
        "filemoon",
        "doodstream",
        "streamwish",
        "streamtape",
        "abyss",
        "voe",
        "uqload",
        "shorticu",
        "afguti",
        "okru",
        "vkvideo"

    ];


    if (
        forbiddenWords.includes(
            value
        )
    ) {

        return true;

    }


    /*
     * episode-1
     * episode-01
     * ep-1
     * ep01
     */

    if (
        /^episode[-_ ]?\d+$/i.test(
            value
        )
    ) {

        return true;

    }


    if (
        /^ep[-_ ]?\d+$/i.test(
            value
        )
    ) {

        return true;

    }


    if (
        /^epizoda[-_ ]?\d+$/i.test(
            value
        )
    ) {

        return true;

    }


    /*
     * Samo broj:
     *
     * /ayse/1
     * /ayse/01
     *
     * tretiramo kao epizodu.
     */

    if (
        /^\d+$/.test(
            value
        )
    ) {

        return true;

    }


    return false;

}


/* =========================================================
   PRONALAZAK SERIJE U PAGE PATH
========================================================= */

/*
 * OVO JE GLAVNA FUNKCIJA.
 *
 * Primer:
 *
 * GA4:
 *
 * /1001-noc-binbir-gece
 *
 * rezultat:
 *
 * 1001-noc-binbir-gece
 *
 *
 * GA4:
 *
 * /1001-noc-binbir-gece/epizoda-01
 *
 * rezultat:
 *
 * 1001-noc-binbir-gece
 *
 *
 * Ali samo ako:
 *
 * 1001-noc-binbir-gece
 *
 * postoji u posts.json.
 */

function findSeriesIdFromPagePath(
    pagePath,
    validIds
) {

    const cleaned =
        cleanPagePath(
            pagePath
        );


    if (!cleaned) {

        return "";

    }


    const segments =
        cleaned
            .split("/")
            .filter(Boolean);


    if (!segments.length) {

        return "";

    }


    /*
     * -----------------------------------------------------
     * NAJVAZNIJE:
     *
     * prvo proveravamo svaki segment
     * da li je TAČNO ID iz posts.json.
     * -----------------------------------------------------
     */

    for (
        const segment
        of segments
    ) {

        const normalized =
            normalizeId(
                segment
            );


        /*
         * Ako je direktno ID serije,
         * odmah ga prihvatamo.
         */

        if (
            validIds.has(
                normalized
            )
        ) {

            return normalized;

        }

    }


    /*
     * -----------------------------------------------------
     * Ako nema direktnog podudaranja,
     * proveravamo kombinacije segmenata.
     *
     * Ovo pomaže ako je URL:
     *
     * /series/ayse
     *
     * /serije/ayse
     * -----------------------------------------------------
     */

    for (
        let start = 0;
        start < segments.length;
        start++
    ) {

        let combined = "";


        for (
            let end = start;
            end < segments.length;
            end++
        ) {

            const segment =
                segments[end];


            /*
             * Ne spajamo epizode.
             */

            if (
                isEpisodeSegment(
                    segment
                )
            ) {

                break;

            }


            if (combined) {

                combined += "/";

            }


            combined +=
                normalizeId(
                    segment
                );


            /*
             * Ako ceo deo odgovara ID-u.
             */

            if (
                validIds.has(
                    combined
                )
            ) {

                return combined;

            }

        }

    }


    return "";

}


/* =========================================================
   UCITAJ GA4 PERIOD
========================================================= */

async function getPeriodData(

    analyticsDataClient,

    nazivPerioda,

    startDate,

    endDate,

    validIds

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
                    100000

            });


        const rows =
            response.rows || [];


        console.log(
            "GA4 redova:",
            rows.length
        );


        /*
         * -------------------------------------------------
         * OVDE SABIRAMO SVE PREGLEDE PO SERIJI.
         * -------------------------------------------------
         */

        const totals =
            new Map();


        let matchedRows = 0;

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


                if (
                    views <= 0
                ) {

                    ignoredRows++;

                    return;

                }


                /*
                 * Pronadji seriju.
                 */

                const seriesId =
                    findSeriesIdFromPagePath(

                        pagePath,

                        validIds

                    );


                /*
                 * Nije serija iz posts.json.
                 */

                if (!seriesId) {

                    ignoredRows++;

                    return;

                }


                matchedRows++;


                const old =
                    totals.get(
                        seriesId
                    ) || 0;


                totals.set(

                    seriesId,

                    old + views

                );

            }

        );


        /*
         * Pretvori Map u niz.
         */

        const result = [];


        totals.forEach(

            function(views, id) {

                if (
                    views <= 0
                ) {

                    return;

                }


                result.push({

                    id:
                        id,

                    views:
                        Number(
                            views
                        )

                });

            }

        );


        /*
         * Sortiraj od najgledanijeg.
         */

        result.sort(

            function(a, b) {

                return (
                    b.views -
                    a.views
                );

            }

        );


        console.log(
            "Redova koji odgovaraju serijama:",
            matchedRows
        );


        console.log(
            "Ignorisanih GA4 redova:",
            ignoredRows
        );


        console.log(
            "Pronadjeno razlicitih serija:",
            result.length
        );


        /*
         * Vrati samo TOP_LIMIT.
         */

        return result.slice(
            0,
            TOP_LIMIT
        );


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
   VALIDACIJA
========================================================= */

function validatePopularJSON(data) {

    section(
        "10. VALIDACIJA popular.json"
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
                        typeof item !== "object"
                    ) {

                        throw new Error(
                            `${category} ima nevalidan element.`
                        );

                    }


                    if (!item.id) {

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


                    if (
                        item.views < 0
                    ) {

                        throw new Error(
                            `${category} ${item.id} ima negativan views.`
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
   PROVERA DA LI SVI ID-jevi POSTOJE U posts.json
========================================================= */

function validateIdsAgainstPosts(

    data,

    validIds

) {

    section(
        "11. PROVERA ID-JEVA"
    );


    const categories = [

        "today",
        "last30Days",
        "allTime"

    ];


    let errors = 0;


    categories.forEach(

        function(category) {

            data[category].forEach(

                function(item) {

                    const id =
                        normalizeId(
                            item.id
                        );


                    if (
                        !validIds.has(id)
                    ) {

                        errors++;

                        console.error(
                            `❌ ${category}: ${id} ne postoji u posts.json`
                        );

                    }

                }

            );

        }

    );


    if (errors > 0) {

        throw new Error(
            "popular.json sadrzi ID-jeve koji ne postoje u posts.json."
        );

    }


    console.log(
        "Svi popular ID-jevi postoje u posts.json."
    );

}


/* =========================================================
   NAPRAVI popular.json
========================================================= */

function createPopularJSON(

    popularnoDanas,

    popularno30Dana,

    popularnoOduvek

) {

    section(
        "9. PRAVLJENJE popular.json"
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
        "popular.json napravljen."
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


    try {

        /* =================================================
           1. POSTS.JSON
        ================================================= */

        const catalog =
            loadPosts();


        const validIds =
            catalog.validIds;


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
           5. GA4 CLIENT
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
            "7A. TODAY"
        );


        /*
         * NEMA FALLBACKA NA YESTERDAY.
         *
         * Ako GA4 danas jos nema podatke,
         * today ostaje [].
         *
         * To je ispravno.
         */

        const danas =
            await getPeriodData(

                analyticsDataClient,

                "Danas",

                "today",

                "today",

                validIds

            );


        /* =================================================
           7B. LAST 30 DAYS
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

                validIds

            );


        /* =================================================
           7C. ALL TIME
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

                validIds

            );


        /* =================================================
           8. PRAVLJENJE JSON-a
        ================================================= */

        const output =
            createPopularJSON(

                danas,

                poslednjih30,

                oduvek

            );


        /* =================================================
           9. PROVERA ID-JEVA
        ================================================= */

        validateIdsAgainstPosts(

            output,

            validIds

        );


        /* =================================================
           SUCCESS
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );


        console.log(
            "Google Service Account: OK"
        );


        console.log(
            "Google Auth: OK"
        );


        console.log(
            "OAuth token: OK"
        );


        console.log(
            "GA4 Data API: OK"
        );


        console.log(
            "GA4 Property: OK"
        );


        console.log(
            "posts.json: OK"
        );


        console.log(
            "Today: OK"
        );


        console.log(
            "Last 30 Days: OK"
        );


        console.log(
            "All Time: OK"
        );


        console.log(
            "Epizode: IGNORISANE"
        );


        console.log(
            "Player stranice: IGNORISANE"
        );


        console.log(
            "Nepoznati ID-jevi: IGNORISANI"
        );


        console.log(
            "TOP 10: OK"
        );


        console.log(
            "popular.json: OK"
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
