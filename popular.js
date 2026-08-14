/* =========================================================
   SVE NA DLANU
   POPULAR.JS - GA4

   PRAVI:

   1. popularnoOduvek
      Najgledanije od pocetka GA4 merenja

   2. popularno30Dana
      Najgledanije poslednjih 30 dana

   3. popularnoDanas
      Najgledanije danas

   SVE SE CUVA U:

   popular.json

   DETALJNA PROVERA:

   1. GOOGLE_SERVICE_ACCOUNT_JSON postoji
   2. JSON je validan
   3. client_email postoji
   4. private_key postoji
   5. private_key format
   6. Google autentikacija
   7. OAuth token
   8. GA4 Data API
   9. GA4 Property pristup
   10. Oduvek podaci
   11. 30 dana podaci
   12. Danasnji podaci
   13. Pravi popular.json
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

const PROPERTY_ID =
    "549759235";

const TOP_LIMIT =
    10;

const OUTPUT_FILE =
    path.join(
        __dirname,
        "popular.json"
    );

const TIME_ZONE =
    "Europe/Belgrade";


/* =========================================================
   NASLOVI LOGOVA
========================================================= */

function separator() {

    console.log(
        "=========================================="
    );

}


function section(
    title
) {

    console.log("");
    separator();

    console.log(
        title
    );

    separator();

}


/* =========================================================
   MASKIRANI EMAIL
========================================================= */

function maskEmail(
    email
) {

    if (!email) {

        return "(nema)";

    }


    const value =
        String(
            email
        );


    const parts =
        value.split("@");


    if (
        parts.length !== 2
    ) {

        return "***";

    }


    const name =
        parts[0];

    const domain =
        parts[1];


    if (
        name.length <= 2
    ) {

        return (
            "***@" +
            domain
        );

    }


    return (
        name.substring(
            0,
            2
        ) +
        "***@" +
        domain
    );

}


/* =========================================================
   GOOGLE SERVICE ACCOUNT
========================================================= */

function getCredentials() {

    section(
        "1. PROVERA GOOGLE SERVICE ACCOUNT SECRET"
    );


    const json =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON;


    if (!json) {

        console.error(
            "❌ GOOGLE_SERVICE_ACCOUNT_JSON NE POSTOJI."
        );


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


    let credentials;


    try {

        credentials =
            JSON.parse(
                json
            );

    } catch (error) {

        console.error(
            "❌ Secret nije validan JSON."
        );


        console.error(
            "JSON.parse greska:"
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


    /* =====================================================
       TYPE
    ===================================================== */

    if (
        credentials.type
    ) {

        console.log(
            "type:",
            credentials.type
        );

    } else {

        console.warn(
            "⚠️ type nije pronadjen."
        );

    }


    /* =====================================================
       PROJECT ID
    ===================================================== */

    if (
        credentials.project_id
    ) {

        console.log(
            "project_id:",
            credentials.project_id
        );

    } else {

        console.warn(
            "⚠️ project_id nije pronadjen."
        );

    }


    /* =====================================================
       CLIENT EMAIL
    ===================================================== */

    if (
        !credentials.client_email
    ) {

        console.error(
            "❌ client_email NE POSTOJI."
        );


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


    /* =====================================================
       PRIVATE KEY
    ===================================================== */

    if (
        !credentials.private_key
    ) {

        console.error(
            "❌ private_key NE POSTOJI."
        );


        throw new Error(
            "Service Account JSON nema private_key."
        );

    }


    console.log(
        "private_key postoji: DA"
    );


    console.log(
        "private_key duzina:",
        credentials.private_key.length,
        "karaktera"
    );


    /* =====================================================
       PROVERA PRIVATE KEY FORMATA
    ===================================================== */

    const privateKey =
        String(
            credentials.private_key
        );


    if (
        !privateKey.includes(
            "BEGIN PRIVATE KEY"
        )
    ) {

        console.error(
            "❌ Private key nema BEGIN PRIVATE KEY."
        );


        throw new Error(
            "Private key nema ispravan PEM format."
        );

    }


    if (
        !privateKey.includes(
            "END PRIVATE KEY"
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


    /* =====================================================
       PROVERA NEWLINE
    ===================================================== */

    const literalNewLines =
        (
            privateKey.match(
                /\\n/g
            ) || []
        ).length;


    const realNewLines =
        (
            privateKey.match(
                /\n/g
            ) || []
        ).length;


    console.log(
        "Private key literalni \\\\n:",
        literalNewLines
    );


    console.log(
        "Private key stvarni newline:",
        realNewLines
    );


    console.log(
        "✅ Private key struktura proverena."
    );


    return credentials;

}


/* =========================================================
   GOOGLE AUTH
========================================================= */

function testPrivateKey(
    credentials
) {

    section(
        "2. PROVERA PRIVATE KEY AUTENTIKACIJE"
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
            "GoogleAuth objekat napravljen."
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
            "Private key / GoogleAuth problem: " +
            error.message
        );

    }

}


/* =========================================================
   TEST GOOGLE TOKENA
========================================================= */

async function testGoogleAuthentication(
    auth
) {

    section(
        "3. PROVERA GOOGLE AUTENTIKACIONOG TOKENA"
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
            "Google Auth client napravljen."
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


        if (
            error.code
        ) {

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
   PRETVORI PAGE PATH U ID SERIJE
========================================================= */

function convertPageToId(
    pagePath
) {

    if (!pagePath) {

        return "";

    }


    let value =
        String(
            pagePath
        ).trim();


    /* =====================================================
       UKLONI POCETNE /
    ===================================================== */

    value =
        value.replace(
            /^\/+/,
            ""
        );


    /* =====================================================
       QUERY STRING
    ===================================================== */

    const questionIndex =
        value.indexOf("?");


    if (
        questionIndex !== -1
    ) {

        const query =
            value.substring(
                questionIndex + 1
            );


        const params =
            new URLSearchParams(
                query
            );


        const id =
            params.get(
                "id"
            );


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


    /* =====================================================
       NEVALIDNE STRANICE
    ===================================================== */

    if (
        value === "series" ||
        value === "series/" ||
        value === "index.html" ||
        value === ""
    ) {

        return "";

    }


    /* =====================================================
       INDEX.HTML
    ===================================================== */

    value =
        value.replace(
            /\/index\.html$/i,
            ""
        );


    /* =====================================================
       .HTML
    ===================================================== */

    value =
        value.replace(
            /\.html$/i,
            ""
        );


    /* =====================================================
       POSLEDNJI DEO PUTANJE
    ===================================================== */

    value =
        value
            .split("/")
            .filter(
                Boolean
            )
            .pop() || "";


    return value.trim();

}


/* =========================================================
   GA4 CLIENT
========================================================= */

function createAnalyticsClient(
    credentials
) {

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
   TEST GA4 PROPERTY
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
                            "1daysAgo",

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
            "Service Account ima pristup Property-ju."
        );


        console.log(
            "Broj test redova:",
            (
                response.rows ||
                []
            ).length
        );


        return true;


    } catch (error) {

        console.error("");
        console.error(
            "❌ GA4 PROPERTY TEST NIJE USPEO."
        );


        console.error(
            "HTTP / gRPC code:",
            error.code ||
            "(nije poznat)"
        );


        console.error(
            "Poruka:",
            error.message ||
            "(nema poruke)"
        );


        console.error(
            "Detalji:",
            error.details ||
            "(nema detalja)"
        );


        if (
            Number(
                error.code
            ) === 16
        ) {

            console.error("");
            console.error(
                "❌ PROBLEM JE AUTENTIKACIJA."
            );


            console.error(
                "Google nije prihvatio kredencijale."
            );


            console.error(
                "Proveri private_key i client_email."
            );

        }


        if (
            Number(
                error.code
            ) === 7
        ) {

            console.error("");
            console.error(
                "❌ PROBLEM JE DOZVOLA."
            );


            console.error(
                "Service Account se autentifikovao,"
            );


            console.error(
                "ali nema pristup GA4 Property-ju."
            );


            console.error(
                "Property:",
                PROPERTY_ID
            );


            console.error(
                "Dodaj Service Account email u:"
            );


            console.error(
                "Google Analytics → Admin → Property Access Management."
            );

        }


        if (
            Number(
                error.code
            ) === 5
        ) {

            console.error("");
            console.error(
                "❌ GA4 PROPERTY NIJE PRONADJEN."
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
   UCITAVANJE JEDNOG PERIODA
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
                    10000

            });


        const rows =
            response.rows ||
            [];


        console.log(
            "✅ GA4 podaci ucitani."
        );


        console.log(
            "Broj GA4 redova:",
            rows.length
        );


        return rows.map(
            function(row) {

                const pagePath =
                    row.dimensionValues?.[0]?.value ||
                    "";


                const views =
                    Number(
                        row.metricValues?.[0]?.value ||
                        0
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

function filterSeriesPages(
    data
) {

    return data.filter(
        function(item) {

            if (
                !item.id
            ) {

                return false;

            }


            const id =
                String(
                    item.id
                ).toLowerCase();


            if (
                id === "index" ||
                id === "index.html" ||
                id === "series"
            ) {

                return false;

            }


            /*
             * Ako GA4 uhvati
             * CSS/JS/slike ili slicno,
             * ignorisemo ih.
             */

            if (
                id.includes(".css") ||
                id.includes(".js") ||
                id.includes(".png") ||
                id.includes(".jpg") ||
                id.includes(".jpeg") ||
                id.includes(".webp") ||
                id.includes(".gif") ||
                id.includes(".svg")
            ) {

                return false;

            }


            return true;

        }
    );

}


/* =========================================================
   UKLONI DUPLIKATE
========================================================= */

function removeDuplicates(
    data
) {

    const map =
        new Map();


    data.forEach(
        function(item) {

            const id =
                String(
                    item.id ||
                    ""
                ).trim();


            if (
                !id
            ) {

                return;

            }


            const old =
                map.get(
                    id
                );


            if (
                old
            ) {

                old.visits +=
                    Number(
                        item.visits ||
                        0
                    );

            } else {

                map.set(
                    id,
                    {

                        id:
                            id,

                        visits:
                            Number(
                                item.visits ||
                                0
                            )

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
   SORTIRAJ I UZMI TOP 10
========================================================= */

function getTop(
    data
) {

    return removeDuplicates(
        filterSeriesPages(
            data
        )
    )
        .sort(
            function(a, b) {

                return (
                    Number(
                        b.visits ||
                        0
                    ) -
                    Number(
                        a.visits ||
                        0
                    )
                );

            }
        )
        .slice(
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


    if (
        !data.length
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
   FORMATIRANJE LISTE ZA JSON
========================================================= */

function formatList(
    data
) {

    return data.map(
        function(item) {

            return {

                id:
                    item.id,

                visits:
                    Number(
                        item.visits ||
                        0
                    )

            };

        }
    );

}


/* =========================================================
   NAPRAVI POPULAR.JSON
========================================================= */

function createPopularJSON(
    popularOduvek,
    popular30Dana,
    popularDanas
) {

    section(
        "7. PRAVLJENJE popular.json"
    );


    const output = {

        updatedAt:
            new Date().toISOString(),

        updatedAtSerbia:
            getSerbiaDateTime(),

        timezone:
            TIME_ZONE,

        propertyId:
            PROPERTY_ID,


        /* ==============================================
           POPULARNO ODUVEK
        ============================================== */

        popularnoOduvek: {

            title:
                "Popularno oduvek",

            count:
                popularOduvek.length,

            items:
                formatList(
                    popularOduvek
                )

        },


        /* ==============================================
           POPULARNO 30 DANA
        ============================================== */

        popularno30Dana: {

            title:
                "Najgledanije 30 dana",

            period:
                "30 dana",

            count:
                popular30Dana.length,

            items:
                formatList(
                    popular30Dana
                )

        },


        /* ==============================================
           POPULARNO DANAS
        ============================================== */

        popularnoDanas: {

            title:
                "Najgledanije danas",

            period:
                "danas",

            count:
                popularDanas.length,

            items:
                formatList(
                    popularDanas
                )

        }

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
        "POPULARNO ODUVEK:",
        popularOduvek.length
    );


    console.log(
        "POPULARNO 30 DANA:",
        popular30Dana.length
    );


    console.log(
        "POPULARNO DANAS:",
        popularDanas.length
    );


    console.log(
        "=========================================="
    );


    printTop(
        "TOP 10 - POPULARNO ODUVEK",
        popularOduvek
    );


    printTop(
        "TOP 10 - NAJGLEDANIJE 30 DANA",
        popular30Dana
    );


    printTop(
        "TOP 10 - NAJGLEDANIJE DANAS",
        popularDanas
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


    try {

        /* ================================================
           1. CREDENTIALS
        ================================================= */

        const credentials =
            getCredentials();


        /* ================================================
           2. GOOGLE AUTH
        ================================================= */

        const auth =
            testPrivateKey(
                credentials
            );


        /* ================================================
           3. OAUTH TOKEN
        ================================================= */

        await testGoogleAuthentication(
            auth
        );


        /* ================================================
           4. GA4 CLIENT
        ================================================= */

        const analyticsDataClient =
            createAnalyticsClient(
                credentials
            );


        /* ================================================
           5. PROPERTY ACCESS
        ================================================= */

        await testGA4Property(
            analyticsDataClient
        );


        /* ================================================
           6A. ODUVEK
        ================================================= */

        section(
            "6A. UCITAVANJE - POPULARNO ODUVEK"
        );


        const oduvek =
            await getPeriodData(
                analyticsDataClient,
                "Popularno oduvek",
                "2020-01-01",
                "today"
            );


        /* ================================================
           6B. 30 DANA
        ================================================= */

        section(
            "6B. UCITAVANJE - POSLEDNJIH 30 DANA"
        );


        const poslednjih30 =
            await getPeriodData(
                analyticsDataClient,
                "Najgledanije 30 dana",
                "30daysAgo",
                "yesterday"
            );


        /* ================================================
           6C. DANAS
        ================================================= */

        section(
            "6C. UCITAVANJE - DANAS"
        );


        const danas =
            await getPeriodData(
                analyticsDataClient,
                "Najgledanije danas",
                "today",
                "today"
            );


        /* ================================================
           7. TOP LISTE
        ================================================= */

        section(
            "7. OBRADA TOP LISTA"
        );


        const popularnoOduvek =
            getTop(
                oduvek
            );


        const popularno30Dana =
            getTop(
                poslednjih30
            );


        const popularnoDanas =
            getTop(
                danas
            );


        console.log(
            "Popularno oduvek:",
            popularnoOduvek.length
        );


        console.log(
            "Popularno 30 dana:",
            popularno30Dana.length
        );


        console.log(
            "Popularno danas:",
            popularnoDanas.length
        );


        /* ================================================
           8. JSON
        ================================================= */

        createPopularJSON(

            popularnoOduvek,

            popularno30Dana,

            popularnoDanas

        );


        /* ================================================
           USPESNO
        ================================================= */

        section(
            "USPESNO ZAVRSENO"
        );


        console.log(
            "✅ Google autentikacija: OK"
        );


        console.log(
            "✅ Private key: OK"
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
            "✅ Popularno oduvek: OK"
        );


        console.log(
            "✅ Popularno 30 dana: OK"
        );


        console.log(
            "✅ Popularno danas: OK"
        );


        console.log(
            "✅ popular.json: OK"
        );


        console.log(
            "Vreme Srbije:",
            getSerbiaDateTime()
        );


        console.log("");

    } catch (error) {

        section(
            "GRESKA"
        );


        console.error(
            "❌ popular.js NIJE USPESNO ZAVRSEN."
        );


        console.error("");


        console.error(
            "Error code:",
            error.code ||
            "(nije poznat)"
        );


        console.error(
            "Error message:",
            error.message ||
            "(nema poruke)"
        );


        if (
            error.details
        ) {

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


        if (
            Number(
                error.code
            ) === 16
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
                "Posebno private_key i client_email."
            );


        } else if (
            Number(
                error.code
            ) === 7
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


            console.error(
                "Dodaj Service Account email u:"
            );


            console.error(
                "Google Analytics → Admin → Property Access Management"
            );


        } else if (
            Number(
                error.code
            ) === 5
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


        } else {

            console.error(
                "❌ Nepoznata Google/API greska."
            );


            console.error(
                "Kod:",
                error.code ||
                "n/a"
            );

        }


        console.error("");


        console.error(
            "=========================================="
        );


        process.exit(
            1
        );

    }

}


/* =========================================================
   START
========================================================= */

createPopularJSONProcess();
