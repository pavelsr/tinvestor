#!/usr/bin/env perl

use utf8;
use strict;
use warnings;
use feature 'say';

use Mojo::UserAgent;
use Text::CSV;
use Selenium::Remote::Driver;
use Data::Dumper::AutoEncode;

my $login = $ARGV[0];
my $password = $ARGV[1];

if ( !$ARGV[0] && !$ARGV[1] ) {
    say "Please run script as $0 <your_tinkoff_login>  <your_tinkoff_pass>";
    exit 0;
}

my $ua = Mojo::UserAgent->new;
my $ttl = 10000;
my $ttl2 = 2000;
my $browser_name = 'chrome';
my $file_name = 'connection.vnc';
my $filename = "stocks_rates.csv";

my %extra_capabilities = (
    enableVNC        => \1,
    name             => 'tinkoff_invest',
    screenResolution => '1280x720'
);
my %params = (
    browser_name       => $browser_name,
    extra_capabilities => \%extra_capabilities,
    sessionTimeout     => '10s'
);

# Для заголовков
# Здесь нужно перечислить все свойства которые мы извлекаем в том порядке, в котором они должны отображаться в csv
# Всё что закоментировано - попробовать расчитать на фронте
my @headers = (
    { name => 'Компания', param => 'name' },
    { name => 'MOEX', param => 'is_moex' },  # Есть ли акции на Московской бирже
    { name => 'Тикер', param => 'ticker' },
    { name => 'URL', param => 'url' },
    { name => 'Количество прогнозов', param => 'analyst_q' },
    { name => 'Сводная рекомендация', param => 'recommendation' },
    { name => 'Прогноз доходности, avg, %', param => 'consensus_percent' },
    { name => 'Доходность за последние полгода, %', param => 'percent_past_half_year' },
    { name => 'Дивидентная доходность, avg, %', param => 'dividend_yield' },
    { name => 'Валюта цены', param => 'currency' },  #
    { name => 'Цена текущая', param => 'price_now' },
    { name => 'Цена прогноз', param => 'consensus_price' },
    { name => 'Цена прогноз min', param => 'price_min' },
    { name => 'Цена прогноз max', param => 'price_max' },
    # { name => 'min доходность, %', param => 'min_yield' }, #
    # { name => 'max доходность, %', param => 'max_yield' }, #
    { name => 'Количество акций в одном стандартном лоте', param => 'lot_size' },
    # { name => 'Цена лота', param => 'price_lot' }, #
    # { name => 'Цена лота в рублях', param => 'price_lot_rub' },
    { name => 'P/E', param => 'P/E' },
    { name => 'Режим торгов', param => 'primary_boardid' },
    { name => 'Уровень листинга', param => 'list_level' },
    { name => 'ISIN', param => 'ISIN' },
);

my $driver = Selenium::Remote::Driver->new(%params);
# $driver->debug_on;

sub parse_main_page {
    my $url = shift;
    $driver->get($url);
    $driver->pause($ttl);
    my $res = {};
    $res->{'url'} = $url;
    $res->{'P/E'} = eval { $driver->find_element_by_xpath('(//div[contains(@class,"DetailsTableItem__item_2phwi")])[3]//div[2]')->get_text };
    $res->{'dividend_yield'} = eval { $driver->find_element_by_xpath('(//div[contains(@class,"DetailsTableItem__item_2phwi")])[6]//div[2]')->get_text };
    return $res;
}

sub get_from_moex {
    my $ticker = shift;
    my $url = 'https://iss.moex.com/iss/securities/'.$ticker.'.xml';
	my $data = $ua->get($url)->result->dom->xml(1);
    my $res = {};
    if ( $data->at('data#description > rows')->children->size ) {
        $res->{is_moex} = 1;
		$res->{ISIN} = eval { $data->at('data#description > rows > row[name="ISIN"]')->attr('value') };
		$res->{list_level} = eval { $data->at('data#description > rows > row[name="LISTLEVEL"]')->attr('value') };
		$res->{primary_boardid} = eval { $data->at('data#boards > rows > row[is_primary=1]')->attr('boardid') };

		$url = 'https://iss.moex.com/iss/engines/stock/markets/shares/boards/'.$res->{primary_boardid}.'/securities.xml?securities='.$ticker;
		$data = $ua->get($url)->result->dom->xml(1);
		$res->{lot_size} = eval { $data->at('data#securities > rows > row')->attr('LOTSIZE') };	
    }
    else {
        $res->{is_moex} = 0;
		# $res->{lot_size} = 1;
    }
	return $res;
}

# парсит страничку компании с прогнозами
sub parse_prognosis_page {
    my $url = shift;
    # has prognosis ?
    $driver->get($url);
    $driver->pause($ttl2);
    my $res = {};
    # $res->{url} = $url;
    
    $res->{name} = eval { $driver->find_element_by_xpath('//span[starts-with(@class,"SecurityHeaderPure__showName")]')->get_text };
    $res->{ticker} = eval { $driver->find_element_by_xpath('//span[starts-with(@class,"SecurityHeaderPure__ticker")]')->get_text };
    
    # Доходность за полгода
    $res->{percent_past_half_year} = eval { $driver->find_element_by_xpath('//div[starts-with(@class,"Earnings__container")]')->get_text }; # sign
    if ( $driver->find_element_by_xpath('//div[starts-with(@class,"Earnings__container")]//div[@data-svg-id="1ad8e046eb6c98e1cba224311aec1fb2.svg"]') ) {
        $res->{percent_past_half_year} = '-'.$res->{percent_past_half_year};  ### !
    }
    
    my @moneys = $driver->find_elements('//div[starts-with(@class,"PrognosisTablePure__consensusValue")]//span[starts-with(@class,"Money__money")]');
    
    # Сводный прогноз
    $res->{consensus_price} = eval { $moneys[0]->get_text };
    $res->{consensus_percent} = eval { $moneys[1]->get_text };
    if ( $driver->find_element_by_xpath('//div[starts-with(@class,"PrognosisTablePure__consensusValue")]//div[@data-svg-id="1ad8e046eb6c98e1cba224311aec1fb2.svg"]') ) {
        $res->{consensus_percent} = '-'.$res->{consensus_percent};
    }
    
    $res->{price_now} = eval { $driver->find_element_by_xpath('(//div[starts-with(@class,"SecurityPriceDetailsPure__money")])[3]')->get_text };
    
    if ( $res->{price_now} =~ /\$/ ) {
        $res->{currency} = '$';
    }
    
    if ( $res->{price_now} =~ /\₽/ ) {
        $res->{currency} = '₽';
    }
    
    $res->{price_min} = eval { $moneys[2]->get_text };
    if ( $res->{price_min} ) { $res->{price_min} = $res->{price_min}.' '.$res->{currency} };
    
    $res->{price_max} = eval { $moneys[3]->get_text };
    $res->{recommendation} = eval { $driver->find_element_by_xpath('(//div[starts-with(@class,"PrognosisTablePure__consensusValue")])[2]')->get_text };    
    
    $res->{analyst_q} = eval { scalar @{ $driver->find_elements('//div[starts-with(@class,"PrognosisTablePure__analyst")]') } };
    
    # warn eDumper $res;
    return $res;
}

# Решил сделать на фронте
sub format_data {
    my $data = shift;
    # format data->{price_now}
    # $data->{price_lot} = $data->{price_now} * $data->{lot_size};
    # if ( $data->{currency} eq '$' ) { ... }
    # $data->{price_lot_rub} = $data->{price_lot} * $course;
    # $data->{min_yield} = 100*($data->{price_min} - $data->{price_now})/$data->{price_now}; # round
    # $data->{max_yield} = 100*($data->{price_max} - $data->{price_now})/$data->{price_now}; # round
}

my $container_info = $ua->get('http://localhost:4444/status')->result->json;
my $ip = $container_info->{browsers}{$browser_name}{''}{unknown}{sessions}[0]{containerInfo}{ip};
say "Container IP: ".$ip;

# $driver->add_cookie('dco.id', '234b308f-4626-4cf6-9b65-d81797568b7a', '/', '.tinkoff.ru', 0, 0);
# $driver->add_cookie('dmp.id', 'f54f5986-880d-49a8-8880-c615a12e8a60', '/', '.tinkoff.ru', 0, 0);
# $driver->add_cookie('dmp.sid', 'AV33kZhqHu4', '/', '.tinkoff.ru', 0, 0);
system( "xdg-open", "http://localhost:8080/#/sessions/" . $driver->session_id );

$driver->get('https://www.tinkoff.ru/');
$driver->get('https://www.tinkoff.ru/login/');
$driver->pause($ttl);
$driver->find_element("//input[\@name='login']")->send_keys($login);
$driver->find_element("//input[\@name='password']")->send_keys($password);
$driver->find_element("//button[\@type='submit']")->click;
$driver->pause($ttl);
$driver->get('https://www.tinkoff.ru/invest/feed/');
$driver->pause($ttl);

my $csv = Text::CSV->new ({ binary => 1, auto_diag => 1 });
open my $fh, ">:encoding(utf8)", $filename or die "new.csv: $!";
$csv->say($fh, [ map { $_->{name} } @headers ] );

my @links = $driver->find_elements("//div[\@data-qa-file='FavoritesWidgetPure']//a"); # https://metacpan.org/pod/Selenium::Remote::WebElement
$_ = $_->get_attribute("href") for @links;
# say $_->get_attribute("href") for @links;

for my $link (@links) {
    
    say $link;
    my $data = parse_main_page($link);
    
    $link .= 'prognosis/';
    %$data = ( %$data, %{parse_prognosis_page($link)} );
    
    %$data = ( %$data, %{get_from_moex($data->{ticker})} );
    
    # format_data($data);
    
    warn eDumper $data;
    my @row;
    for my $field ( map { $_->{param} } @headers ) {
        push @row, $data->{$field};
    }
    $csv->say($fh, \@row);
}

$driver->quit();
close $fh or die "$filename: $!";
