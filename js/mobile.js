document.arrive(".expenseGroupClickDiv", function () {
    this.addEventListener("click", () => {
        document.querySelector("#details-tab").click()
    })
});


try {
    google.charts.setOnLoadCallback(drawChart);
}
catch (e) {
    console.error(e)
}

function drawChart() {


    var options = {
        title: 'Report',
        pieHole: 0.1,
        fontSize: 10,
        pieSliceText: "none",
        height: 250,
        chartArea: { left: 20},
        slices: {
            9: { offset: 0.2 }
        },
        backgroundColor: "#242424",
        legend: {
            textStyle: { color: "#6495ed" },

        },
        titleTextStyle: { color: "#6495ed" }
    };

    var data = google.visualization.arrayToDataTable(chartData);

    var chart = new google.visualization.PieChart(document.getElementById('piechart'));

    chart.draw(data, options);
}

$(".card").swipe( {
    swipeLeft:function(event, direction, distance, duration, fingerCount) {
        try {
            new bootstrap.Tab($(".nav-tabs button.active").parent().next("li").find("button")).show();
        } catch (error) {
        }
       },
    swipeRight:function(event, direction, distance, duration, fingerCount) {
        try {
            new bootstrap.Tab($(".nav-tabs button.active").parent().prev("li").find("button")).show();
        } catch (error) {
        }
       },
 });