var csv_filename = 'stocks_rates.csv';
var display_original_data = 0; // отключает всё форматирование и показывает данные в raw формате, для дебага
var min_max_as_percentage = 1; // test

// https://jsfiddle.net/serikov/5b0j9ocs/
$.get( "https://www.tinkoff.ru/api/v1/currency_rates/", function( data ) {
  data = $.grep( data.payload.rates, function(obj) {
    return ( ( obj.fromCurrency.name == 'USD' ) && ( obj.toCurrency.name == 'RUB' ) && ( obj.category == 'SavingAccountTransfers' ) );
  });
  var rate = data[0].sell;
  $("#dollar_sell_rate").html(' (текущий курс: 1$ = '+rate+'₽ )');
});

function get_tradingview_link(ticker, price_str) {
	var exchange = 'MOEX';
	if ( price_str.match(/\$/) ) {
		// console.log( price_str );
		exchange = 'LSE'
	}
	return 'https://ru.tradingview.com/symbols/'+exchange+'-'+ticker;
	// https://ru.tradingview.com/symbols/NASDAQ-YNDX/
	// https://ru.tradingview.com/symbols/MOEX-YNDX/
}

// parse string as number and round it
// f('1,45798 %') = 1.46
function _round(str) {
	// console.log('_round() ' + str);
	if( !str ) { return null };
	return parseFloat( parseFloat( str.toString().replace(" ", "").replace(",", ".") ).toFixed(2) );
	// return Math.round( (parseFloat(str.toString().replace(",", "."))*100)/100 );
}

// count delta in percent between two float digits
function _delta_percentage(newv, oldv) {
	if ( newv === null ) { return null };
	// if ( isNaN(newv) ) { console.log('No prognosis'); return null };
	// console.log( '_delta_percentage('+newv+','+oldv+')' );
	// console.log(newv);
	return parseFloat( (100*(newv-oldv)/oldv).toFixed(2) );
}

function createTable(results, callback, options) {
	var table = $('table#jquery-table');
    table.empty();
	
	// округлить дивидентную доходность, P/E +
	// убрать: прогнозную цену (дублируется в прогноз доходности), режим торгов, is_moex +
	// min и max прогноз дать в процентах
	// чекбоксы: показать цены лота в рублях, показать ISIN, показывать только рекомендуемые акции (как permalink фильтров)
	
	var thead_tr = $('<tr>');
	$.each(results.meta.fields, function(x, col_name) {
		
		if (!display_original_data) {
			
			// ПЕРЕИМЕНОВАНИЕ И УДАЛЕНИЕ
			// сначала в цикле перечисляем колонки которые не отображаем вообще 
			if (
			   ( col_name == "URL" )
		 	   || ( col_name == "Режим торгов" )
			   || ( col_name == "ISIN" )
			   || ( col_name == "Страна" )
			   || ( col_name == "MOEX" )
		   	   ) {
				return true;
			}
		
			if ( min_max_as_percentage && ( ( col_name == "Цена прогноз min" ) || ( col_name == "Цена прогноз max" ) ) ) {
				return true;
			}
			
			// ОТОБРАЖЕНИЕ
			if ( min_max_as_percentage && ( col_name == "Прогноз доходности, avg, %" ) ) {
				$('<td>').text(col_name).appendTo(thead_tr);
				$('<td>').text('Доходность min, %').appendTo(thead_tr);
				$('<td>').text('Доходность max, %').appendTo(thead_tr);
			}
			// вставить еще одну колонку после другой конкретной
			else if ( col_name == "Количество акций в одном стандартном лоте" ) {
				// переименовать колонку
				col_name = "Акций в лоте";
				$('<td>').text(col_name).appendTo(thead_tr);
				$('<td>').text('Цена лота').appendTo(thead_tr);
				
			}
			else {
				$('<td>').text(col_name).appendTo(thead_tr);
			}	
		}
		else {
			$('<td>').text(col_name).appendTo(thead_tr);
		}
		
	});
	
	table.append( $('<thead>').append(thead_tr) );	
    
	var tbody = $('<tbody>');
    $.each(results.data, function(x, row) {
        var tr = $('<tr>');
        $.each(row, function(col_name, col_value) {
			
			if (!display_original_data) {
			// TO-DO: перенести в виджет форматирования, https://mottie.github.io/tablesorter/docs/example-widget-formatter.html
			// сначала в цикле перечисляем колонки которые не отображаем вообще, копипастим сюда из $.each(results.meta.fields
				if (  ( col_name == "URL" )
			 	   || ( col_name == "Режим торгов" )
				   || ( col_name == "ISIN" )
				   || ( col_name == "Страна" )
				   || ( col_name == "MOEX" )
				   ) {
					return true;
				}
				
				// не отображаем
				if ( min_max_as_percentage && ( ( col_name == "Цена прогноз min" ) || ( col_name == "Цена прогноз max" ) ) ) {
					return true;
				}
				
				
				if (   ( col_name == "Доходность за последние полгода, %" ) 
					|| ( col_name == "Прогноз доходности, avg, %" )
					|| ( col_name == "Цена текущая" )
					|| ( col_name == "Цена прогноз" )
					|| ( col_name == "Цена прогноз min" )
					|| ( col_name == "Цена прогноз max" )
					|| ( col_name == "Дивидентная доходность, avg, %" )
					|| ( col_name == "P/E" )
				 	) {
					col_value = _round(col_value);
				}
				
				// вся конструкция ниже ушла в блок if-elseif-else отображения т.к. col_name нет в итерируемом объекте
				// if ( min_max_as_percentage ) {
				// 	if ( ( col_name == "Цена прогноз min" ) || ( col_name == "Цена прогноз max" ) ) {
				// 		col_value = _delta_percentage( _round(col_value), _round(row["Цена текущая"]) );
				// 	}
				// }
				
				// Количество акций в одном стандартном лоте
				
				
				// if you want to debug fomatting at particular column
				// if ( col_name == "P/E" ) {
				// 	console.log( "ROUND " + col_value + ' -> ' + _round(col_value) );
				// }
				
				// отображаем данные в таблицу
				
				if ( col_name == "Компания" ) { // ссылка берется из csv
					tr.append( $('<td>').append('<a target="_blank" href="'+row["URL"]+ '">'+col_value+'</a>') );
				}
				// в с свойствах объекта который пришёл от PapaParse нет этих новых свойств поэтому единственный способ норм отобразить - добавлять по-порядку
				else if ( col_name == "Прогноз доходности, avg, %" ) {
					if ( min_max_as_percentage ) {
						tr.append( $('<td>').text(col_value) );
						tr.append( $('<td>').text( _delta_percentage( _round(row["Цена прогноз min"]), _round(row["Цена текущая"]) ) ) );    // Доходность min, %
						tr.append( $('<td>').text( _delta_percentage( _round(row["Цена прогноз max"]), _round(row["Цена текущая"]) ) ) );	   // Доходность max, %'
					}
					else {
						tr.append( $('<td>').text(col_value) ); 
					}
				}
				else if ( col_name == "Количество акций в одном стандартном лоте" ) {  // расчиитываем цену лота
					tr.append( $('<td>').text(col_value) );
					var lot_price = _round(row["Цена текущая"]);
					if ( col_value ) {
						lot_price = _round(row["Цена текущая"])*parseInt(col_value);
					}
					tr.append( $('<td>').text(lot_price) );
				}
				
				// else if ( col_name == "Теханализ" ) { // как ссылка, динамическая
				// 	tr.append( $('<td>').append('<a target="_blank" href="'+ get_tradingview_link(row["Тикер"],row["Цена текущая"]) + '">ссылка</a>') );
				// }
				else { // как текст
	            	tr.append( $('<td>').text(col_value) );
				}
			}
			else {
				tr.append( $('<td>').text(col_value) );
			}
        });
		
		// еще один вариант динамически добавить колонку в таблицу - гуд только если колонка последняя 
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
		widgets: ['zebra', 'stickyHeaders', 'filter', 'toggle-ts', 'reorder' ],
		// widgets: ['zebra', 'stickyHeaders', 'filter', 'toggle-ts', 'formatter',  'reorder', 'columnSelector' ],
		showProcessing: true,
		widgetOptions: {
			formatter_column: {   // test
        		1 : function( text, data ) {
					return text+' ₽';
				}
        	},
			// columnSelector_container : $('#columnSelector'),
			filter_formatter: {  // column numbering starts from 0
				// 2: function($cell, indx) {
				// 	return $.tablesorter.filterFormatter.select2($cell, indx, {
				// 		match: false
				// 	});
				// },
				// 6: function($cell, indx) {
				// 	return $.tablesorter.filterFormatter.select2($cell, indx, {
				// 		match: false
				// 	});
				// }
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
			console.log("Parsing complete:", results.data); // Здесь у объекта уже будут имена ключей = имени колонки
			createTable(results, TableSort);
			
			$("#jquery-table").bind('filterInit filterEnd', function(event, data) {
				$("#obj_counter").html('Всего показано '+data.filteredRows+' акций из '+data.totalRows);
			});
			
			$('#only_recommended').change(function() {
			    if(this.checked) {
					var filters = [];
					filters[2] = 'Покупать|';
					filters[3] = '>10|';
					filters[4] = '>5|';
					$.tablesorter.setFilters( $("#jquery-table"), filters, true );
			    }
				else {
					$("#jquery-table").trigger('filterReset');
				}
			});
			
			$('#min_max_as_percentage').change(function() {
				console.log('Change');
				min_max_as_percentage = $(this).val();
				createTable(results, TableSort);
				// $.tablesorter.refreshWidgets( $("#jquery-table") );
			});
			
			$('#all_prices_in_rub').change(function() {
				console.log('Change');
				if(this.checked) {
					console.log('addWidget');
					$.tablesorter.addWidget('formatter');
					$.tablesorter.applyWidget( $("#jquery-table") );
					$.tablesorter.refreshWidgets( $("#jquery-table") );
					
				}
			});
		}
	});
});
