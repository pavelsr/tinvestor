var csv_filename = 'stocks_rates.csv';

function createTable(results, callback) {
	var table = $('table#jquery-table');
    table.empty();
	
	var thead_tr = $('<tr>');
	$.each(results.meta.fields, function(x, col_h) {
	    $('<td>').text(col_h).appendTo(thead_tr);
	});
	table.append( $('<thead>').append(thead_tr) );	
    
	var tbody = $('<tbody>');
    $.each(results.data, function(x, row) {
        var tr = $('<tr>');
        $.each(row, function(y, col) {
            tr.append( $('<td>').text(col) );
        });
        tbody.append(tr);
    });

    table.append(tbody);
    
    callback();
}

function TableSort() {
	$("#jquery-table").tablesorter({
		theme: 'blue',
		widthFixed: true,
		widgets: ['zebra', 'stickyHeaders', 'filter'],
		showProcessing: true,
		widgetOptions: {
			filter_formatter: {
				3: function($cell, indx) {
					console.log("1 tablesorter.filterFormatter.select2 start");
					return $.tablesorter.filterFormatter.select2($cell, indx, {
						match: false
					});
				}
			}
		}
	});
	console.log("tablesorter finished");
}

Papa.parse(csv_filename, {
	download: true,
	header: true,
	complete: function(results) {
		console.log("Parsing complete:", results.data);
		createTable(results, TableSort);
	}
});