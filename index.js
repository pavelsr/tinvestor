var csv_filename = 'stocks_rates.csv';

function get_tradingview_link(ticker, price_str) {
	var exchange = 'MOEX';
	if ( price_str.match(/\$/) ) {
		console.log( price_str );
		exchange = 'NASDAQ'
	}
	return 'https://ru.tradingview.com/symbols/'+exchange+'-'+ticker;
	// https://ru.tradingview.com/symbols/NASDAQ-YNDX/
	// https://ru.tradingview.com/symbols/MOEX-YNDX/
}

function createTable(results, callback) {
	var table = $('table#jquery-table');
    table.empty();
	
	var thead_tr = $('<tr>');
	$.each(results.meta.fields, function(x, col_h) {
		if ( col_h == "URL" ) {
			return true;
		}
	    $('<td>').text(col_h).appendTo(thead_tr);
	});
	
	table.append( $('<thead>').append(thead_tr) );	
    
	var tbody = $('<tbody>');
    $.each(results.data, function(x, row) {
        var tr = $('<tr>');
        $.each(row, function(col_name, col_value) {
			if ( col_name == "Компания" ) {
				tr.append( $('<td>').append('<a target="_blank" href="'+row["URL"]+ '">'+col_value+'</a>') );
			}
			else if ( col_name == "URL" ) {
				return true;
			}
			else {
            	tr.append( $('<td>').text(col_value) );
			}
        });
		tr.append( $('<td>').append('<a target="_blank" href="'+ get_tradingview_link(row["Тикер"],row["Цена текущая"]) + '">ссылка</a>') );
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

$.get( csv_filename, function( data, textStatus, request ) {
	$("span#file_date").text( request.getResponseHeader("Last-Modified") );
	Papa.parse(data, {
		header: true,
		skipEmptyLines: true,
		complete: function(results) {
			results.meta.fields.push('Теханализ');
			console.log("Parsing complete:", results.data);
			createTable(results, TableSort);
		}
	});
});


