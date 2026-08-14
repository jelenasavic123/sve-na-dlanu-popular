/* =========================================================
   SVE NA DLANU - POPULAR.JS
   GA4 DATA API

   Property:
   549759235

   Radi:
   - cita GA4
   - uzima page_view podatke
   - pronalazi stranice serija
   - sortira po pregledima
   - uzima TOP 20
   - pravi popular.json
   - radi automatski svaki dan u 10:45
   - vreme: Europe/Belgrade
========================================================= */

const fs = require("fs");
const path = require("path");

const { BetaAnalyticsDataClient } =
    require("@google-analytics/data");


/* =========================================================
   PODESAVANJA
========================================================= */

const PROPERTY_ID =
    "549759235";

const TIME_ZONE =
    "Europe/Belgrade";

const RUN_HOUR =
    10;

const RUN_MINUTE =
    45;

const TOP_LIMIT =
    20;


/* =========================================================
   GOOGLE JSON KLJUC
========================================================= */

const CREDENTIALS_FILE =
    path.join(
        __dirname,
        "serijeuploader-ddf5462126ed.json"
    );


/* =========================================================
   OUTPUT
========================================================= */

const OUTPUT_FILE =
    path.join(
        __dirname,
        "popular.json"
    );


/* =========================================================
   PROVERA KLJUCA
========================================================= */

if (
    !fs.existsSync(
        CREDENTIALS_FILE
    )
) {

    console.error("");
    console.error(
        "GRESKA: Google credentials fajl nije pronadjen."
    );

    console.error(
        "Ocekivano:"
    );

    console.error(
        CREDENTIALS_FILE
    );

    console.error("");

    process.exit(1);

}


/* =========================================================
   GOOGLE ANALYTICS CLIENT
========================================================= */

const analyticsDataClient =
    new BetaAnalyticsDataClient({

        keyFilename:
            CREDENTIALS_FILE

    });


/* =========================================================
   SRPSKO VREME
========================================================= */

function getSerbiaTime() {

    const now =
        new Date();

    const formatter =
        new Intl.DateTimeFormat(
            "en-GB",
            {

                timeZone:
                    TIME_ZONE,

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    false

            }
        );

    const parts =
        formatter.formatToParts(
            now
        );

    const result = {};

    parts.forEach(
        function(part) {

            if (
                part.type !==
                "literal"
            ) {

                result[
                    part.type
                ] =
                    part.value;

            }

        }
    );

    return {

        hour:
            Number(
                result.hour
            ),

        minute:
            Number(
                result.minute
            ),

        second:
            Number(
                result.second
            )

    };

}


/* =========================================================
   SRPSKI DATUM I VREME
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
   GOOGLE ANALYTICS
========================================================= */

async function getAnalyticsData() {

    console.log("");
    console.log(
        "Povezujem se sa Google Analytics..."
    );

    console.log(
        "Property:",
        PROPERTY_ID
    );

    console.log(
        "Citam podatke..."
    );

    const [
        response
    ] =
        await analyticsDataClient.runReport({

            property:
                `properties/${PROPERTY_ID}`,

            dateRanges: [

                {
                    startDate:
                        "30daysAgo",

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

            orderBys: [

                {
                    metric: {

                        metricName:
                            "screenPageViews"

                    },

                    desc:
                        true

                }

            ],

            limit:
                1000

        });


    return response.rows || [];

}


/* =========================================================
   IZVADI ID SERIJE IZ URL-a
========================================================= */

function extractSeriesId(
    pagePath
) {

    if (
        !pagePath
    ) {

        return null;

    }


    const value =
        String(
            pagePath
        );


    /*
     * Primer:
     *
     * /series/index.html?id=moja-sudbina
     *
     */


    const match =
        value.match(
            /[?&]id=([^&#]+)/i
        );


    if (
        match &&
        match[1]
    ) {

        try {

            return decodeURIComponent(
                match[1]
            );

        } catch {

            return match[1];

        }

    }


    /*
     * Ako nema ?id=
     *
     * proveravamo i putanju:
     *
     * /series/moja-sudbina/
     *
     */


    const pathMatch =
        value.match(
            /\/series\/([^/?#]+)/i
        );


    if (
        pathMatch &&
        pathMatch[1]
    ) {

        return decodeURIComponent(
            pathMatch[1]
        );

    }


    return null;

}


/* =========================================================
   NAPRAVI POPULAR.JSON
========================================================= */

async function createPopularJSON() {

    console.log("");
    console.log(
        "=========================================="
    );

    console.log(
        " SVE NA DLANU - GA4 POPULARNO"
    );

    console.log(
        "=========================================="
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
        "=========================================="
    );


    try {

        const rows =
            await getAnalyticsData();


        console.log(
            "GA4 redova:",
            rows.length
        );


        const seriesMap =
            new Map();


        rows.forEach(
            function(row) {

                const pagePath =
                    row.dimensionValues &&
                    row.dimensionValues[0]
                        ?.
                    value || "";


                const views =
                    row.metricValues &&
                    row.metricValues[0]
                        ?.
                    value || "0";


                const id =
                    extractSeriesId(
                        pagePath
                    );


                if (
                    !id
                ) {

                    return;

                }


                const numberViews =
                    Number(
                        views
                    ) || 0;


                if (
                    seriesMap.has(
                        id
                    )
                ) {

                    const old =
                        seriesMap.get(
                            id
                        );


                    old.visits +=
                        numberViews;

                } else {

                    seriesMap.set(
                        id,
                        {

                            id:
                                id,

                            visits:
                                numberViews

                        }
                    );

                }

            }
        );


        const popular =
            [...seriesMap.values()]
                .sort(
                    function(a,b) {

                        return (
                            b.visits -
                            a.visits
                        );

                    }
                )
                .slice(
                    0,
                    TOP_LIMIT
                );


        console.log("");
        console.log(
            "TOP 20:"
        );


        popular.forEach(
            function(item, index) {

                console.log(
                    `${index + 1}. ${item.id} - ${item.visits} pregleda`
                );

            }
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

            period:
                "30 dana",

            count:
                popular.length,

            items:
                popular

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
            "=========================================="
        );

        console.log(
            "USPESNO!"
        );

        console.log(
            "Napravljen:"
        );

        console.log(
            OUTPUT_FILE
        );

        console.log(
            "Broj:",
            popular.length
        );

        console.log(
            "Vreme Srbije:",
            getSerbiaDateTime()
        );

        console.log(
            "=========================================="
        );

        console.log("");


    } catch (error) {

        console.error("");
        console.error(
            "=========================================="
        );

        console.error(
            "GRESKA GA4:"
        );

        console.error(
            error.message
        );

        console.error(
            "=========================================="
        );

        console.error("");

    }

}


/* =========================================================
   TESTIRANJE
========================================================= */

async function runNow() {

    await createPopularJSON();

}


/* =========================================================
   AUTOMATSKO VREME
========================================================= */

let lastRunKey =
    "";


function checkTime() {

    const time =
        getSerbiaTime();


    const now =
        new Date();


    const currentKey =
        now
            .toISOString()
            .slice(
                0,
                10
            ) +
        "_" +
        String(
            RUN_HOUR
        ).padStart(
            2,
            "0"
        ) +
        ":" +
        String(
            RUN_MINUTE
        ).padStart(
            2,
            "0"
        );


    console.log(
        `[Srbija] ${String(time.hour).padStart(2,"0")}:${String(time.minute).padStart(2,"0")}:${String(time.second).padStart(2,"0")}`
    );


    if (

        time.hour ===
        RUN_HOUR

        &&

        time.minute ===
        RUN_MINUTE

        &&

        lastRunKey !==
        currentKey

    ) {

        lastRunKey =
            currentKey;


        createPopularJSON();

    }

}


/* =========================================================
   START
========================================================= */

console.log("");
console.log(
    "=========================================="
);

console.log(
    " SVE NA DLANU - POPULAR.JS"
);

console.log(
    "=========================================="
);

console.log(
    "GA4 Property:",
    PROPERTY_ID
);

console.log(
    "Vremenska zona:",
    TIME_ZONE
);

console.log(
    "Automatsko vreme:",
    "10:45"
);

console.log(
    "TOP:",
    TOP_LIMIT
);

console.log(
    "Credentials:",
    CREDENTIALS_FILE
);

console.log(
    "Output:",
    OUTPUT_FILE
);

console.log(
    "=========================================="
);

console.log("");

console.log(
    "Skripta je pokrenuta."
);

console.log(
    "Za test odmah:"
);

console.log(
    "node popular.js --now"
);

console.log("");



/* =========================================================
   AKO JE --now
========================================================= */

if (
    process.argv.includes(
        "--now"
    )
) {

    runNow();

} else {

    /*
     * Proveri vreme odmah
     */

    checkTime();


    /*
     * Provera svake sekunde
     */

    setInterval(
        checkTime,
        1000
    );

}