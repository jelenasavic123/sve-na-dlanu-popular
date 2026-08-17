/* =========================================================
   NAPRAVI popular.json
========================================================= */

function createPopularJSON(
    popularOduvek,
    popular30Dana,
    popularDanas
) {

    section(
        "7. PRAVLJENJE popular.json"
    );


    /* =====================================================
       FORMAT:
       
       today
       last30Days
       allTime
    ===================================================== */

    const output = {

        today: popularDanas.map(
            function(item) {

                return {

                    id: item.id,

                    views: Number(
                        item.visits || 0
                    )

                };

            }
        ),


        last30Days: popular30Dana.map(
            function(item) {

                return {

                    id: item.id,

                    views: Number(
                        item.visits || 0
                    )

                };

            }
        ),


        allTime: popularOduvek.map(
            function(item) {

                return {

                    id: item.id,

                    views: Number(
                        item.visits || 0
                    )

                };

            }
        )

    };


    /* =====================================================
       SACUVAJ JSON
    ===================================================== */

    fs.writeFileSync(

        OUTPUT_FILE,

        JSON.stringify(
            output,
            null,
            4
        ),

        "utf8"

    );


    /* =====================================================
       LOG
    ===================================================== */

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


    /* =====================================================
       PRIKAZ
    ===================================================== */

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
