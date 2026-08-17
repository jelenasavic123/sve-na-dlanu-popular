/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4
   =========================================================

   FUNKCIJA:

   Svaki put kada se skripta pokrene,
   uzima podatke iz Google Analytics 4
   i pravi:

   popular.json


   JSON FORMAT:

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


   KATEGORIJE:

   1. today
      - Najgledanije danas

   2. last30Days
      - Najgledanije poslednjih 30 dana

   3. allTime
      - Najgledanije od pocetka GA4 merenja


   TOP LIMIT:

   10 serija po kategoriji.


   PROVERE:

   1. GOOGLE_SERVICE_ACCOUNT_JSON
   2. JSON format
   3. project_id
   4. client_email
   5. private_key
   6. private_key PEM
   7. private_key newline
   8. GoogleAuth
   9. OAuth token
   10. GA4 Data API Client
   11. GA4 Property
   12. Today
   13. Last 30 Days
   14. All Time
   15. Filtriranje
   16. Deduplikacija
   17. TOP 10
   18. popular.json
   19. Validacija

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


/*
 * GA4 Property ID
 */

const PROPERTY_ID = "549759235";


/*
 * Koliko serija ide u popular.json
 */

const TOP_LIMIT = 10;


/*
 * Izlazni JSON fajl
 */

const OUTPUT_FILE = path.join(
    __dirname,
    "popular.json"
);


/*
 * Vremenska zona
 */

const TIME_ZONE = "Europe/Belgrade";


/*
 * Pocetak All Time statistike
 */

const ALL_TIME_START_DATE = "2020-01-01";


/*
 * Maksimalan broj GA4 redova
 */

const GA4_LIMIT = 10000;


/* =========================================================
   LOGOVI
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
   MASKIRANJE EMAILA
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
   NORMALIZACIJA PRIVATE KEY
========================================================= */

/*
 * Ovo je veoma vazno.
 *
 * Ako GitHub Secret sadrzi:
 *
 * -----BEGIN PRIVATE KEY-----\nABC...\n-----END PRIVATE KEY-----
 *
 * pretvara \n u stvarne newline karaktere.
 */

function normalizePrivateKey(privateKey) {

    if (!privateKey) {

        throw new Error(
            "private_key ne postoji."
        );

    }

    let key = String(privateKey);

    /*
     * Ako postoje literalni \n
     * pretvori ih u stvarne newline.
     */

    key = key.replace(
        /\\n/g,
        "\n"
    );

    /*
     * Windows newline
     */

    key = key.replace(
        /\r\n/g,
        "\n"
    );

    /*
     * Ukloni eventualne razmake na pocetku/kraju
     */

    key = key.trim();

    return key;

}


/* =========================================================
   GOOGLE SERVICE ACCOUNT
========================================================= */

function getCredentials() {

    section(
        "1. PROVERA GOOGLE SERVICE ACCOUNT SECRET"
    );


    /* -----------------------------------------------------
       SECRET
    ----------------------------------------------------- */

    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;


    if (!json) {

        console.error(
            "❌ GOOGLE_SERVICE_ACCOUNT_JSON NE POSTOJI."
        );

        console.error("");

        console.error(
            "Proveri:"
        );

        console.error(
            "GitHub → Settings → Secrets and variables → Actions"
        );

        throw new Error(
            "Nedostaje GOOGLE_SERVICE_ACCOUNT_JSON secret."
        );

    }


    console.log(
        "✅ GOOGLE_SERVICE_ACCOUNT_JSON postoji."
    );


    console.log(
        "Duzina Secret-a:",
        json.length,
        "karaktera"
    );


    /* -----------------------------------------------------
       JSON PARSIRANJE
    ----------------------------------------------------- */

    let credentials;


    try {

        credentials =
            JSON.parse(json);

    } catch (error) {

        console.error(
            "❌ Secret nije validan JSON."
        );

        console.error(
            error.message
        );

        throw new Error(
            "GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON."
        );

    }


    console.log(
        "✅ JSON je validan."
    );


    /* -----------------------------------------------------
       PROJECT ID
    ----------------------------------------------------- */

    if (!credentials.project_id) {

        throw new Error(
            "Service Account JSON nema project_id."
        );

    }


    console.log(
        "project_id:",
        credentials.project_id
    );


    console.log(
        "✅ project_id postoji."
    );


    /* -----------------------------------------------------
       CLIENT EMAIL
    ----------------------------------------------------- */

    if (!credentials.client_email) {

        throw new Error(
            "Service Account JSON nema client_email."
        );

    }


    console.log(
        "client_email:",
        maskEmail(
            credentials.client_email
        )
    );


    console.log(
        "✅ client_email postoji."
    );


    /* -----------------------------------------------------
       PRIVATE KEY
    ----------------------------------------------------- */

    if (!credentials.private_key) {

        throw new Error(
            "Service Account JSON nema private_key."
        );

    }


    console.log(
        "private_key postoji: DA"
    );


    console.log(
        "Originalna private_key duzina:",
        credentials.private_key.length
    );


    /* -----------------------------------------------------
       NORMALIZACIJA
    ----------------------------------------------------- */

    credentials.private_key =
        normalizePrivateKey(
            credentials.private_key
        );


    console.log(
        "Normalizovana private_key duzina:",
        credentials.private_key.length
    );


    /* -----------------------------------------------------
       BEGIN
    ----------------------------------------------------- */

    if (
        !credentials.private_key.includes(
            "-----BEGIN PRIVATE KEY-----"
        )
    ) {

        console.error(
            "❌ Private key nema BEGIN PRIVATE KEY."
        );

        throw new Error(
            "Private key nema ispravan PEM format."
        );

    }


    /* -----------------------------------------------------
       END
    ----------------------------------------------------- */

    if (
        !credentials.private_key.includes(
            "-----END PRIVATE KEY-----"
        )
    ) {

        console.error(
            "❌ Private key nema END PRIVATE KEY."
        );

        throw new Error(
            "Private key nema ispravan PEM format."
        );

    }


    console.log(
        "✅ Private key ima ispravan PEM format."
    );


    /* -----------------------------------------------------
       NEWLINE
    ----------------------------------------------------- */

    const literalNewLines =
        (
            String(
                json
            ).match(
                /\\n/g
            ) || []
        ).length;


    const realNewLines =
        (
            credentials.private_key.match(
                /\n/g
            ) || []
        ).length;


    console.log(
        "Literalni \\n u Secret-u:",
        literalNewLines
    );


    console.log(
        "Stvarni newline u private key:",
        realNewLines
    );


    if (realNewLines < 2) {

        throw new Error(
            "Private key nema dovoljno newline karaktera."
        );

    }


    console.log(
        "✅ Private key newline struktura je ispravna."
    );


    return credentials;

}


/* =========================================================
   GOOGLE AUTH
========================================================= */

function createGoogleAuth(credentials) {

    section(
        "2. PROVERA GOOGLE AUTH"
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
            "✅ GoogleAuth objekat uspesno napravljen."
        );


        return auth;


    } catch (error) {

        console.error(
            "❌ GoogleAuth nije mogao da se napravi."
        );


        console.error(
            "Greska:",
            error.message
        );


        throw new Error(
            "GoogleAuth problem: " +
            error.message
        );

    }

}


/* =========================================================
   GOOGLE OAUTH TOKEN
========================================================= */

async function testGoogleAuthentication(auth) {

    section(
        "3. PROVERA GOOGLE OAUTH TOKENA"
    );


    try {

        console.log(
            "Pokusavam da dobijem Google OAuth2 token..."
        );


        const client =
            await auth.getClient();


        if (!client) {

            throw new Error(
                "GoogleAuth nije vratio client."
            );

        }


        console.log(
            "✅ Google Auth client napravljen."
        );


        const tokenResponse =
            await client.getAccessToken();


        if (
            !tokenResponse ||
            !tokenResponse.token
        ) {

            throw new Error(
                "Google OAuth2 access token nije dobijen."
            );

        }


        console.log(
            "✅ Google OAuth2 access token uspesno dobijen."
        );


        console.log(
            "Token postoji: DA"
        );


        return client;


    } catch (error) {

        console.error(
            "❌ GOOGLE AUTENTIKACIJA NIJE USPESNA."
        );


        console.error(
            "Error:",
            error.message
        );


        if (error.code) {

            console.error(
                "Error code:",
                error.code
            );

        }


        throw new Error(
            "Google OAuth autentikacija nije uspela: " +
            error.message
        );

    }

}


/* =========================================================
   SRPSKO VREME
========================================================= */

function getSerbiaDateTime() {

    return new Intl.DateTimeFormat(

        "sr-RS",

        {

            timeZone:
                TIME_ZONE,

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit",

            hour12:
                false

        }

    ).format(
        new Date()
    );

}


/* =========================================================
   PAGE PATH → ID SERIJE
========================================================= */

function convertPageToId(pagePath) {

    if (!pagePath) {

        return "";

    }


    let value =
        String(
            pagePath
        ).trim();


    /* -----------------------------------------------------
       SKINI POČETNI /
    ----------------------------------------------------- */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /* -----------------------------------------------------
       QUERY STRING
    ----------------------------------------------------- */

    const questionIndex =
        value.indexOf("?");


    if (questionIndex !== -1) {

        const query =
            value.substring(
                questionIndex + 1
            );


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


        value =
            value.substring(
                0,
                questionIndex
            );

    }


    /* -----------------------------------------------------
       HASH
    ----------------------------------------------------- */

    const hashIndex =
        value.indexOf("#");


    if (hashIndex !== -1) {

        value =
            value.substring(
                0,
                hashIndex
            );

    }


    /* -----------------------------------------------------
       NEVALIDNE STRANICE
    ----------------------------------------------------- */

    if (

        value === "" ||

        value === "series" ||

        value === "series/" ||

        value === "index.html"

    ) {

        return "";

    }


    /* -----------------------------------------------------
       INDEX.HTML
    ----------------------------------------------------- */

    value =
        value.replace(
            /\/index\.html$/i,
            ""
        );


    /* -----------------------------------------------------
       .HTML
    ----------------------------------------------------- */

    value =
        value.replace(
            /\.html$/i,
            ""
        );


    /* -----------------------------------------------------
       POSLEDNJI DEO PUTANJE
    ----------------------------------------------------- */

    value =
        value
            .split("/")
            .filter(Boolean)
            .pop() || "";


    return value.trim();

}


/* =========================================================
   GA4 CLIENT
========================================================= */

function createAnalyticsClient(credentials) {

    section(
        "4. PRIPREMA GA4 DATA API CLIENTA"
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
            "✅ BetaAnalyticsDataClient uspesno napravljen."
        );


        console.log(
            "GA4 Property:",
            PROPERTY_ID
        );


        return client;


    } catch (error) {

        console.error(
            "❌ Nije moguce napraviti GA4 client."
        );


        console.error(
            error.message
        );


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
        "5. PROVERA PRISTUPA GA4 PROPERTY-JU"
    );


    console.log(
        "Property:",
        PROPERTY_ID
    );


    console.log(
        "Saljem test zahtev Google Analytics Data API-ju..."
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
                            "yesterday",

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
            "✅ GA4 Data API je odgovorio."
        );


        console.log(
            "✅ Service Account ima pristup Property-ju."
        );


        console.log(
            "Broj test redova:",
            (response.rows || []).length
        );


        return true;


    } catch (error) {

        console.error("");

        console.error(
            "❌ GA4 PROPERTY TEST NIJE USPEO."
        );


        console.error(
            "HTTP / gRPC code:",
            error.code || "(nije poznat)"
        );


        console.error(
            "Poruka:",
            error.message || "(nema poruke)"
        );


        console.error(
            "Detalji:",
            error.details || "(nema detalja)"
        );


        if (
            Number(error.code) === 16
        ) {

            console.error("");

            console.error(
                "❌ 16 UNAUTHENTICATED"
            );

            console.error(
                "Google nije prihvatio kredencijale."
            );

            console.error(
                "Proveri client_email i private_key."
            );

        }


        if (
            Number(error.code) === 7
        ) {

            console.error("");

            console.error(
                "❌ 7 PERMISSION_DENIED"
            );

            console.error(
                "Service Account nema pristup GA4 Property-ju."
            );

            console.error(
                "Property:",
                PROPERTY_ID
            );

            console.error("");

            console.error(
                "Dodaj Service Account email u:"
            );

            console.error(
                "Google Analytics → Admin → Property Access Management"
            );

        }


        if (
            Number(error.code) === 5
        ) {

            console.error("");

            console.error(
                "❌ 5 NOT_FOUND"
            );

            console.error(
                "GA4 Property nije pronadjen."
            );

            console.error(
                "Proveri PROPERTY_ID:",
                PROPERTY_ID
            );

        }


        throw error;

    }

}


/* =========================================================
   UCITAVANJE GA4 PERIODA
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
        "UCITAVAM:",
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
                    GA4_LIMIT

            });


        const rows =
            response.rows || [];


        console.log(
            "✅ GA4 podaci ucitani."
        );


        console.log(
            "Broj GA4 redova:",
            rows.length
        );


        if (
            rows.length >= GA4_LIMIT
        ) {

            console.warn("");

            console.warn(
                "⚠️ Dostignut je GA4 LIMIT od",
                GA4_LIMIT,
                "redova."
            );

            console.warn(
                "Ako sajt ima vise od 10.000 razlicitih pagePath-ova,"
            );

            console.warn(
                "moze biti potrebno dodati paginaciju."
            );

        }


        return rows.map(

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


                return {

                    originalPath:
                        pagePath,

                    id:
                        id,

                    visits:
                        views

                };

            }

        );


    } catch (error) {

        console.error("");

        console.error(
            "❌ Greska pri citanju perioda:",
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


        console.error(
            "Details:",
            error.details
        );


        throw error;

    }

}


/* =========================================================
   FILTRIRANJE SERIJA
========================================================= */

function filterSeriesPages(data) {

    return data.filter(

        function(item) {

            if (!item.id) {

                return false;

            }


            const id =
                String(
                    item.id
                )
                .trim()
                .toLowerCase();


            if (!id) {

                return false;

            }


            /* -------------------------------------------------
               IGNORISI INDEX
            ------------------------------------------------- */

            if (

                id === "index" ||

                id === "index.html" ||

                id === "series"

            ) {

                return false;

            }


            /* -------------------------------------------------
               IGNORISI FAJLOVE
            ------------------------------------------------- */

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
                ".map"

            ];


            for (
                const extension
                of forbiddenExtensions
            ) {

                if (
                    id.includes(extension)
                ) {

                    return false;

                }

            }


            return true;

        }

    );

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
                .trim();


            if (!id) {

                return;

            }


            const views =
                Number(
                    item.visits || 0
                );


            const old =
                map.get(id);


            if (old) {

                /*
                 * Ako isti ID postoji na vise
                 * pagePath putanja,
                 * sabiramo preglede.
                 */

                old.visits += views;

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
   TOP LISTA
========================================================= */

function getTop(data) {

    const filtered =
        filterSeriesPages(
            data
        );


    const unique =
        removeDuplicates(
            filtered
        );


    unique.sort(

        function(a, b) {

            return (

                Number(
                    b.visits || 0
                )

                -

                Number(
                    a.visits || 0
                )

            );

        }

    );


    return unique.slice(
        0,
        TOP_LIMIT
    );

}


/* =========================================================
   PRIKAZ TOP LISTE
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

                `${index + 1}. ${item.id} - ${item.visits} pregleda`

            );

        }

    );

}


/* =========================================================
   FORMAT LISTE
========================================================= */

function formatList(data) {

    return data.map(

        function(item) {

            return {

                id:
                    item.id,

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


    /* -----------------------------------------------------
       GLAVNI OBJEKAT
    ----------------------------------------------------- */

    if (!data) {

        throw new Error(
            "popular.json je prazan."
        );

    }


    /* -----------------------------------------------------
       TODAY
    ----------------------------------------------------- */

    if (!Array.isArray(data.today)) {

        throw new Error(
            "popular.json nema validan today niz."
        );

    }


    /* -----------------------------------------------------
       LAST 30 DAYS
    ----------------------------------------------------- */

    if (!Array.isArray(data.last30Days)) {

        throw new Error(
            "popular.json nema validan last30Days niz."
        );

    }


    /* -----------------------------------------------------
       ALL TIME
    ----------------------------------------------------- */

    if (!Array.isArray(data.allTime)) {

        throw new Error(
            "popular.json nema validan allTime niz."
        );

    }


    console.log(
        "✅ today postoji."
    );


    console.log(
        "✅ last30Days postoji."
    );


    console.log(
        "✅ allTime postoji."
    );


    /* -----------------------------------------------------
       PROVERA SVIH ELEMENATA
    ----------------------------------------------------- */

    const allLists = [

        {
            name:
                "today",

            items:
                data.today

        },

        {
            name:
                "last30Days",

            items:
                data.last30Days

        },

        {
            name:
                "allTime",

            items:
                data.allTime

        }

    ];


    allLists.forEach(

        function(list) {

            list.items.forEach(

                function(item) {

                    if (!item.id) {

                        throw new Error(

                            `Lista ${list.name} ima element bez id.`

                        );

                    }


                    if (
                        typeof item.views !== "number"
                    ) {

                        throw new Error(

                            `Lista ${list.name}, ID ${item.id} nema validan views.`

                        );

                    }


                    if (
                        item.views < 0
                    ) {

                        throw new Error(

                            `Lista ${list.name}, ID ${item.id} ima negativan views.`

                        );

                    }

                }

            );

        }

    );


    console.log(
        "✅ Svi elementi imaju id."
    );


    console.log(
        "✅ Svi elementi imaju numericki views."
    );


    /* -----------------------------------------------------
       TOP LIMIT
    ----------------------------------------------------- */

    if (
        data.today.length > TOP_LIMIT
    ) {

        throw new Error(
            "today ima vise od TOP_LIMIT elemenata."
        );

    }


    if (
        data.last30Days.length > TOP_LIMIT
    ) {

        throw new Error(
            "last30Days ima vise od TOP_LIMIT elemenata."
        );

    }


    if (
        data.allTime.length > TOP_LIMIT
    ) {

        throw new Error(
            "allTime ima vise od TOP_LIMIT elemenata."
        );

    }


    console.log(
        "✅ TOP LIMIT provera uspesna."
    );


    console.log("");

    console.log(
        "TODAY:",
        data.today.length
    );


    console.log(
        "LAST 30 DAYS:",
        data.last30Days.length
    );


    console.log(
        "ALL TIME:",
        data.allTime.length
    );


    console.log(
        "✅ popular.json je potpuno validan."
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


    /* -----------------------------------------------------
       SACUVAJ
    ----------------------------------------------------- */

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
        "✅ popular.json uspesno napravljen."
    );


    console.log(
        "Lokacija:",
        OUTPUT_FILE
    );


    console.log("");

    console.log(
        "=========================================="
    );


    console.log(
        "TODAY:",
        output.today.length
    );


    console.log(
        "LAST 30 DAYS:",
        output.last30Days.length
    );


    console.log(
        "ALL TIME:",
        output.allTime.length
    );


    console.log(
        "=========================================="
    );


    /* -----------------------------------------------------
       PRIKAZ TOP LISTA
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       VALIDACIJA
    ----------------------------------------------------- */

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
        "Vreme Srbije:",
        getSerbiaDateTime()
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
        "All Time start:",
        ALL_TIME_START_DATE
    );


    try {


        /* =================================================
           1. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* =================================================
           2. GOOGLE AUTH
        ================================================= */

        const auth =
            createGoogleAuth(
                credentials
            );


        /* =================================================
           3. OAUTH TOKEN
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
           5. PROPERTY ACCESS
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );


        /* =================================================
           6A. TODAY
        ================================================= */

        section(
            "6A. UCITAVANJE - TODAY"
        );


        const danas =
            await getPeriodData(

                analyticsDataClient,

                "Najgledanije danas",

                "today",

                "today"

            );


        /* =================================================
           6B. LAST 30 DAYS
        ================================================= */

        section(
            "6B. UCITAVANJE - LAST 30 DAYS"
        );


        const poslednjih30 =
            await getPeriodData(

                analyticsDataClient,

                "Najgledanije poslednjih 30 dana",

                "30daysAgo",

                "yesterday"

            );


        /* =================================================
           6C. ALL TIME
        ================================================= */

        section(
            "6C. UCITAVANJE - ALL TIME"
        );


        const oduvek =
            await getPeriodData(

                analyticsDataClient,

                "Najgledanije od pocetka",

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
            "TOP TODAY:",
            popularnoDanas.length
        );


        console.log(
            "TOP LAST 30 DAYS:",
            popularno30Dana.length
        );


        console.log(
            "TOP ALL TIME:",
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
            "✅ Google Service Account: OK"
        );


        console.log(
            "✅ JSON credentials: OK"
        );


        console.log(
            "✅ project_id: OK"
        );


        console.log(
            "✅ client_email: OK"
        );


        console.log(
            "✅ private_key: OK"
        );


        console.log(
            "✅ Private key format: OK"
        );


        console.log(
            "✅ Private key newline: OK"
        );


        console.log(
            "✅ GoogleAuth: OK"
        );


        console.log(
            "✅ OAuth token: OK"
        );


        console.log(
            "✅ GA4 Data API: OK"
        );


        console.log(
            "✅ GA4 Property pristup: OK"
        );


        console.log(
            "✅ Today podaci: OK"
        );


        console.log(
            "✅ Last 30 Days podaci: OK"
        );


        console.log(
            "✅ All Time podaci: OK"
        );


        console.log(
            "✅ Filtriranje serija: OK"
        );


        console.log(
            "✅ Uklanjanje duplikata: OK"
        );


        console.log(
            "✅ TOP 10: OK"
        );


        console.log(
            "✅ popular.json: OK"
        );


        console.log(
            "Vreme Srbije:",
            getSerbiaDateTime()
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


        /* =================================================
           GLOBALNA GRESKA
        ================================================= */

        section(
            "GRESKA"
        );


        console.error(
            "❌ popular.js NIJE USPESNO ZAVRSEN."
        );


        console.error("");


        console.error(
            "Error code:",
            error.code || "(nije poznat)"
        );


        console.error(
            "Error message:",
            error.message || "(nema poruke)"
        );


        if (error.details) {

            console.error(
                "Error details:",
                error.details
            );

        }


        console.error("");

        console.error(
            "=========================================="
        );


        console.error(
            "DIJAGNOSTIKA"
        );


        console.error(
            "=========================================="
        );


        /* -------------------------------------------------
           UNAUTHENTICATED
        ------------------------------------------------- */

        if (
            Number(error.code) === 16
        ) {

            console.error(
                "❌ 16 UNAUTHENTICATED"
            );


            console.error(
                "Google nije prihvatio autentikacione kredencijale."
            );


            console.error(
                "Proveri GOOGLE_SERVICE_ACCOUNT_JSON."
            );


            console.error(
                "Posebno client_email i private_key."
            );

        }


        /* -------------------------------------------------
           PERMISSION DENIED
        ------------------------------------------------- */

        else if (
            Number(error.code) === 7
        ) {

            console.error(
                "❌ 7 PERMISSION_DENIED"
            );


            console.error(
                "Service Account je autentifikovan,"
            );


            console.error(
                "ali nema pristup GA4 Property-ju."
            );


            console.error(
                "Property:",
                PROPERTY_ID
            );


            console.error("");


            console.error(
                "Dodaj Service Account email u:"
            );


            console.error(
                "Google Analytics → Admin → Property Access Management"
            );

        }


        /* -------------------------------------------------
           NOT FOUND
        ------------------------------------------------- */

        else if (
            Number(error.code) === 5
        ) {

            console.error(
                "❌ 5 NOT_FOUND"
            );


            console.error(
                "GA4 Property nije pronadjen."
            );


            console.error(
                "Proveri PROPERTY_ID:",
                PROPERTY_ID
            );

        }


        /* -------------------------------------------------
           INVALID ARGUMENT
        ------------------------------------------------- */

        else if (
            Number(error.code) === 3
        ) {

            console.error(
                "❌ 3 INVALID_ARGUMENT"
            );


            console.error(
                "GA4 Data API je odbio zahtev."
            );


            console.error(
                "Proveri dimenzije, metrike i date range."
            );

        }


        /* -------------------------------------------------
           OSTALO
        ------------------------------------------------- */

        else {

            console.error(
                "❌ Nepoznata Google/API greska."
            );


            console.error(
                "Kod:",
                error.code || "n/a"
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
