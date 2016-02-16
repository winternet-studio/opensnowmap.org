/*
opensnowmap.js
Javascript code for www.opensnowmap.org website
Copyright (C) 2011  Yves Cainaud

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

//TODO
// add geometry_length to pite API
// 

var server="http://"+window.location.host+"/";
if (! window.location.host) {
	server=window.location.pathname.replace("index.html",'');
}
if (server.search('home') != -1){ server = "http://beta.opensnowmap.org/";} 
//~ var hillshade_URL="http://www.opensnowmap.org/hillshading/"
//~ var contours_URL="http://www2.opensnowmap.org/tiles-contours/"
var pistes_overlay_URL="http://www.opensnowmap.org/opensnowmap-overlay/"
//~ var snow_cover_URL="http://www2.opensnowmap.org/snow-cover/"

var mode="raster";
var EXT_MENU=true;
var EDIT_SHOWED=false;
var CATCHER;
var MARKER = false;
var BASELAYER = 'mapquest';
var permalink_id;
var permalink_ofsetter;
var zoomBar;
var PRINT_TYPE= 'small';
var ONCE=false;
var map;
var lat=46.82084;
var lon=6.39942;
var zoom=2;//2
var modifyControl;
var highlightCtrl, selectCtrl;
var SIDEBARSIZE='full'; //persistent sidebar
var data={};
var today=new Date();
var update;

var sideBarHistoryArray=[]; // store sidebar content for History
var currentResult=-1; // index in history
var searchComplete=0;

var GetProfileXHR=[]; // to abort
var PisteAPIXHR=[]; // to abort
var jsonPisteLists=[];
var jsonPisteList={};

// a dummy proxy script is located in the directory to allow use of wfs
OpenLayers.ProxyHost = "cgi/proxy.cgi?url=";

var icon = {
"downhill":'pics/alpine.png',
"cable_car":'pics/cable_car.png',
"chair_lift":'pics/chair_lift.png',
"drag_lift":'pics/drag_lift.png',
"funicular":'pics/funicular.png',
"gondola":'pics/gondola.png',
"jump":'pics/jump.png',
"magic_carpet":'pics/magic_carpet.png',
"mixed_lift":'pics/mixed_lift.png',
"nordic":'pics/nordic.png',
"skitour":'pics/skitour.png',
"hike":'pics/snowshoe.png',
"t-bar":'pics/drag_lift.png',
"j-bar":'pics/drag_lift.png',
"platter":'pics/drag_lift.png',
"rope_tow":'pics/drag_lift.png',
"station":'pics/station.png',
"playground":'pics/playground.png',
"sled":'pics/sled.png',
"sleigh":'pics/sleigh.png',
"snow_park":'pics/snow_park.png',
"ski_jump":'pics/jump.png'

}
var diffcolor = {
"novice":'green',
"easy":'blue',
"intermediate":'red',
"advanced":'black',
"expert":'orange',
"freeride":'E9C900'
}
var diffcolorUS = {
"novice":'green',
"easy":'green',
"intermediate":'blue',
"advanced":'black',
"expert":'black',
"freeride":'#E9C900'
}
// IE fix
if(!document.getElementsByClassName) {
    document.getElementsByClassName = function(className) {
        return this.querySelectorAll("." + className);
    };
    Element.prototype.getElementsByClassName = document.getElementsByClassName;
}


function infoMode(){
	var m=''
	if (mode == "raster") {
		/*show_helper();*/
		vectorLayers();
		m="vector";
		map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
		map.div.style.cursor='pointer';
		//~ document.images['pointPic'].src='pics/pistes-pointer-on.png';
		document.getElementById('selectButton').style.backgroundColor="#E65B3F";
		document.images['selectPic'].src='pics/select-22-hover.png';
		document.getElementById('selectButton').onmouseout = function() { document.images['selectPic'].src='pics/select-22-hover.png'; };
	}
	if (mode == "vector") {
		// first destroy the select and highlight controls
		close_sideBar();
		
		map.events.unregister("click", map, onMapClick);
		map.removeControl(modifyControl);
		map.removeLayer(linesLayer);
		map.removeLayer(pointsLayer);
		//~ map.removeLayer(highlightLayer);
		
		
		m="raster";
		map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
		close_helper();
		//~ document.images['pointPic'].src='pics/pistes-pointer.png';
		map.div.style.cursor='default';
		document.getElementById('selectButton').style.backgroundColor="#FDFDFD";
		document.images['selectPic'].src='pics/select-22.png';
		document.getElementById('selectButton').onmouseout = function() { document.images['selectPic'].src='pics/select-22.png'; };
	}
	mode=m;
	return true;
}
function loadjscssfile(filename, filetype){
 if (filetype=="js"){ //if filename is a external JavaScript file
  var fileref=document.createElement('script')
  fileref.setAttribute("type","text/javascript")
  fileref.setAttribute("src", filename)
 }
 else if (filetype=="css"){ //if filename is an external CSS file
  var fileref=document.createElement("link")
  fileref.setAttribute("rel", "stylesheet")
  fileref.setAttribute("type", "text/css")
  fileref.setAttribute("href", filename)
 }
 if (typeof fileref!="undefined")
  document.getElementsByTagName("head")[0].appendChild(fileref)
}
function removejscssfile(filename, filetype){
 var targetelement=(filetype=="js")? "script" : (filetype=="css")? "link" : "none" //determine element type to create nodelist from
 var targetattr=(filetype=="js")? "src" : (filetype=="css")? "href" : "none" //determine corresponding attribute to test for
 var allsuspects=document.getElementsByTagName(targetelement)
 for (var i=allsuspects.length; i>=0; i--){ //search backwards within nodelist for matching elements to remove
  if (allsuspects[i] && allsuspects[i].getAttribute(targetattr)!=null && allsuspects[i].getAttribute(targetattr).indexOf(filename)!=-1)
   allsuspects[i].parentNode.removeChild(allsuspects[i]) //remove element by calling parentNode.removeChild()
 }
}
function get_page(url){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",url,false);
	//~ oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	response = oRequest.responseText;
	response = response.replace("../","");
	return response;
}
function showMenu() {
	document.getElementById('MenuBlock').style.display='block';
	document.getElementById('menuExt').style.display='none';
	EXT_MENU=true;
	resize_sideBar();
	return true;
}
function closeMenu() {
	document.getElementById('MenuBlock').style.display='none';
	document.getElementById('menuExt').style.display='block';
	EXT_MENU=false;
	resize_sideBar();
	return true;
}
function close_sideBar() {
	SIDEBARSIZE=0;
	document.getElementById('sideBar').style.display='inline';
	document.getElementById('sideBar').style.height=SIDEBARSIZE+'px';
	
	document.getElementById('sideBarHistory').className = document.getElementById('sideBarHistory').className.replace('shown','hidden');
	document.getElementById('sideBarHistory').innerHTML=''; // Must prevent duplicate IDs
	document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown','hidden');
	document.getElementById('search_results').className = document.getElementById('search_results').className.replace('shown','hidden');
	document.getElementById('topo').className = document.getElementById('topo').className.replace('shown','hidden');
	document.getElementById('catcher').className = document.getElementById('catcher').className.replace('shown','hidden');
	document.getElementById('helper').className = document.getElementById('helper').className.replace('shown','hidden');
	document.getElementById('about').className = document.getElementById('about').className.replace('shown','hidden');
	document.getElementById('legend').className = document.getElementById('legend').className.replace('shown','hidden');
	document.getElementById('languages').className = document.getElementById('languages').className.replace('shown','hidden');
	document.getElementById('settings').className = document.getElementById('settings').className.replace('shown','hidden');
	document.getElementById('edit').className = document.getElementById('edit').className.replace('shown','hidden');
	
	document.getElementById('sideBar').style.display='none';
	EDIT_SHOWED = false;
	CATCHER=false;
	
}
function close_helper(){
	close_sideBar();
}
function close_donate(){
	document.getElementById('donate-centering').style.display='none'
}
function show_catcher(){
	close_sideBar();
	document.getElementById('sideBar').style.display='inline';
	CATCHER=true;
	SIDEBARSIZE=210;
	resize_sideBar();
	
	var title='<i>&nbsp;&nbsp;'+today.getDate()+'.'+(today.getMonth()+1)+'.'+today.getFullYear()+'&nbsp;</i>';
	
	document.getElementById('sideBarTitle').innerHTML=title;
	var catcherDiv = document.getElementById('catcher');
	catcherDiv.className= catcherDiv.className.replace('hidden','shown');
	
	var full_length = parseFloat(data.downhill) + parseFloat(data.nordic) + parseFloat(data.aerialway) + parseFloat(data.skitour) + parseFloat(data.sled) + parseFloat(data.snowshoeing);
	document.getElementById('full_length').innerHTML = full_length;
	
	translateDiv('catcher');
	fillData('catcher');
	cacheInHistory(catcherDiv.innerHTML);
}
function show_helper(){
	close_sideBar();
	document.getElementById('sideBar').style.display='inline';
	SIDEBARSIZE='full';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='';
	
	var helperDiv = document.getElementById('helper');
	helperDiv.className= helperDiv.className.replace('hidden','shown');
	cacheInHistory(helperDiv.innerHTML);
	
	//~ if (map.getZoom()<11){
		//~ document.getElementById('zoomin-helper').style.display = 'inline';
	//~ } else {
		//~ document.getElementById('zoomin-helper').style.display = 'none';
	//~ }
}
function show_about() {
	close_sideBar();
	document.getElementById('sideBar').style.display='inline';
	SIDEBARSIZE='full';
	resize_sideBar();
	document.getElementById('sideBar').style.display='inline';
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('ABOUT');
	
	var aboutDiv = document.getElementById('about');
	aboutDiv.className= aboutDiv.className.replace('hidden','shown');

	var XMLHttp = new XMLHttpRequest();
	url = server+'iframes/about.'+iframelocale+'.html';
	XMLHttp.open("GET",url);
	XMLHttp.setRequestHeader("Content-type", "text/html; charset=utf-8");
	
	XMLHttp.onreadystatechange = function (){
		if (XMLHttp.readyState == 4) {
			var full_length = parseFloat(data.downhill) + parseFloat(data.nordic) + parseFloat(data.aerialway) + parseFloat(data.skitour) + parseFloat(data.sled) + parseFloat(data.snowshoeing);
			
			var content = XMLHttp.responseText;
			content = content.replace('**update**',data.date)
			.replace('**nordic**',data.nordic)
			.replace('**downhill**',data.downhill)
			.replace('**aerialway**',data.aerialway)
			.replace('**skitour**',data.skitour)
			.replace('**sled**',data.sled)
			.replace('**snowshoeing**',data.snowshoeing);
			aboutDiv.innerHTML = content;
			//aboutDiv.style.display='inline';
			cacheInHistory(aboutDiv.innerHTML);
		}
	}
	XMLHttp.send();
	return true;
}
function show_edit() {
	
	document.getElementById('sideBar').style.display='inline';
	SIDEBARSIZE='full';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('EDIT').replace('<br/>',' ');
	
	var editDiv = document.getElementById('edit');
	editDiv.className= editDiv.className.replace('hidden','shown');
	translateDiv('edit');
	cacheInHistory(editDiv.innerHTML);
	
	permalink_id = new OpenLayers.Control.Permalink("permalink.id",
	"http://www.openstreetmap.org/edit",{'createParams': permalink1Args});
	map.addControl(permalink_id);
	permalink_ofsetter = new OpenLayers.Control.Permalink("permalink.offseter",
		"offseter");
	map.addControl(permalink_ofsetter);
	
	if (map.getZoom() < 13) {
		document.getElementById('edit_zoom_in').innerHTML='&nbsp;'+_('zoom_in');
		document.getElementById('permalink.id').href = "javascript:void(0)";  
		document.getElementById('permalink.id').target="";
		document.getElementById('permalink.offseter').href = "javascript:void(0)";  
		document.getElementById('permalink.offseter').target="";
		document.getElementById('id_pic').src="pics/id-grey-48.png";
		document.getElementById('josm_pic').src="pics/josm-grey-48.png";
		document.getElementById('offseter_pic').src="pics/offseter-grey-48.png";
	}else {
		document.getElementById('edit_zoom_in').innerHTML='';
	}
		EDIT_SHOWED = true;
}
function show_legend() {
	close_sideBar();
	document.getElementById('sideBar').style.display='inline';
	SIDEBARSIZE='full';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML=='&nbsp;'+_('MAP_KEY').replace('<br/>',' ');
	
	var legendDiv = document.getElementById('legend');
	legendDiv.className= legendDiv.className.replace('hidden','shown');
	translateDiv('legend');
	cacheInHistory(legendDiv.innerHTML);
}
function show_settings() {
	document.getElementById('sideBar').style.display='inline';
	SIDEBARSIZE='full';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('SETTINGS').replace('<br/>',' ');
	
	var settingDiv = document.getElementById('settings');
	settingDiv.className= settingDiv.className.replace('hidden','shown');
	
	// highlight current base layer
	var mq=map.getLayersByName("MapQuest")[0];
	var osm=map.getLayersByName("OSM")[0];
	if (osm) {
		document.getElementById('setOSMLayer').style.border="solid #AAA 2px";
		document.getElementById('setMQLayer').style.border="solid #CCCCCC 1px";
	}
	if (mq) {
		document.getElementById('setMQLayer').style.border="solid #AAA 2px";
		document.getElementById('setOSMLayer').style.border="solid #CCCCCC 1px";
	}
	// check for currently displayed layers
	var d=map.getLayersByName("Daily")[0];
	var w=map.getLayersByName("Weekly")[0];
	//~ var m=map.getLayersByName("Monthly")[0];
	if (d) {
		document.getElementById('checkD').checked=true;
	}
	if (w) {
		document.getElementById('checkW').checked=true;
	}
	translateDiv('settings');
	//~ if (m) {
		//~ document.getElementById('checkM').checked=true;
	//~ }
}
function getWinHeight(){
	  var myWidth = 0, myHeight = 0;
	  if( typeof( window.innerWidth ) == 'number' ) {
		//Non-IE
		myWidth = window.innerWidth;
		myHeight = window.innerHeight;
	  } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
		//IE 6+ in 'standards compliant mode'
		myWidth = document.documentElement.clientWidth;
		myHeight = document.documentElement.clientHeight;
	  } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
		//IE 4 compatible
		myWidth = document.body.clientWidth;
		myHeight = document.body.clientHeight;
	  }
	return parseInt(myHeight);
}
function resize_sideBar() {
	if (document.getElementById('sideBar').style.display !== 'none') {
		document.getElementById('sideBar').style.bottom = 10+document.getElementById("MainBlock").clientHeight+'px';
		if (SIDEBARSIZE=='full'){
			document.getElementById('sideBar').style.height= (getWinHeight() - document.getElementById("MainBlock").clientHeight -35)+"px";
			document.getElementById('sideBar').style.display='inline';
			var sidebars = document.getElementsByClassName('sideBarContent');
			for (i =0; i< sidebars.length; i++) {
				sidebars[i].style.height= (document.getElementById("sideBar").clientHeight - 33)+"px";
			}
			document.getElementById('sideBarInBox').style.height= (document.getElementById("sideBar").clientHeight - 33)+"px";
		} else {
			document.getElementById('sideBar').style.display='inline';
			document.getElementById('sideBar').style.height=SIDEBARSIZE+'px';
			
			var sidebars = document.getElementsByClassName('sideBarContent');
			for (i =0; i< sidebars.length; i++) {
				sidebars[i].style.height= SIDEBARSIZE-35+'px';
			}
			document.getElementById('sideBarInBox').style.height= SIDEBARSIZE-35+'px';
		}
	}
	return true
}
function show_live_edits(when,display) {
	if (display) {
		var DiffStyle = new OpenLayers.Style({
				pointRadius: 1.5,
				fillColor: "#FF1200",
				strokeColor:"#FF1200"})
		if (when == "daily") {
			var DailyLayer=new OpenLayers.Layer.Vector("Daily", {
						strategies: [new OpenLayers.Strategy.Fixed(),
									new OpenLayers.Strategy.Cluster()],
						protocol: new OpenLayers.Protocol.HTTP({
							url: "data/daily.tsv",
							format: new OpenLayers.Format.Text()
							}),
						styleMap: new OpenLayers.StyleMap({
							"default": DiffStyle
							}),
						projection: new OpenLayers.Projection("EPSG:4326")
					});
			map.addLayers([DailyLayer]);
		}
		if (when == "weekly") {
			var WeeklyLayer=new OpenLayers.Layer.Vector("Weekly", {
						strategies: [new OpenLayers.Strategy.Fixed(),
									new OpenLayers.Strategy.Cluster()],
						protocol: new OpenLayers.Protocol.HTTP({
							url: "data/weekly.tsv",
							format: new OpenLayers.Format.Text()
							}),
						styleMap: new OpenLayers.StyleMap({
							"default": DiffStyle
							}),
						projection: new OpenLayers.Projection("EPSG:4326")
					});
			map.addLayers([WeeklyLayer]);
		}
		if (when == "monthly") {
			var MonthlyLayer=new OpenLayers.Layer.Vector("Monthly", {
						strategies: [new OpenLayers.Strategy.Fixed(),
									new OpenLayers.Strategy.Cluster()],
						protocol: new OpenLayers.Protocol.HTTP({
							url: "data/monthly.tsv",
							format: new OpenLayers.Format.Text()
							}),
						styleMap: new OpenLayers.StyleMap({
							"default": DiffStyle
							}),
						projection: new OpenLayers.Projection("EPSG:4326")
					});
			map.addLayers([MonthlyLayer]);
		}
	} else {
		if (when == "daily") {map.getLayersByName("Daily")[0].destroy();}
		if (when == "weekly") {map.getLayersByName("Weekly")[0].destroy();}
		if (when == "monthly") {map.getLayersByName("Monthly")[0].destroy();}
	}
}
function show_languages() {
	close_sideBar();
	document.getElementById('sideBar').style.display='inline';
	SIDEBARSIZE=150;
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='<img style="margin: 2px 4px 2px 4px;vertical-align: middle;" src="pics/flags/'+locale+'.png">'+_('lang').replace('<br/>',' ');
	
	var languageDiv = document.getElementById('languages');
	languageDiv.className= languageDiv.className.replace('hidden','shown');
	html = ''
	for (l=0; l<locs.length; l++ ){
		html += '<a id="" onclick="setlanguage(\''+locs[l]+'\');">'
			 +'<img style="margin: 10px 2px 10px 20px;vertical-align: middle;" src="pics/flags/'+locs[l]+'.png">'+locs[l]+'</a>';
	}
	languageDiv.innerHTML=html;
	cacheInHistory(languageDiv.innerHTML);
}

function cacheInHistory(html) {
	sideBarHistoryArray.push(html);
	jsonPisteLists.push(jsonPisteList);
	currentResult+=1;
	if (sideBarHistoryArray.length > 5 ) {
		sideBarHistoryArray.splice(0,1);
		jsonPisteLists.splice(0,1);
		currentResult -= 1;
	}
	if (currentResult == sideBarHistoryArray.length -1 ) {
		document.getElementById("next").style.color='#AAA';
	}else {
		document.getElementById("next").style.color='#444444';
	}
	if (currentResult <= 0 ) {
		document.getElementById("prev").style.color='#AAA';
	}else {
		document.getElementById("prev").style.color='#444444';
	}
	return true;
}

function prevResult(){
	if (sideBarHistoryArray.length >= currentResult-1 && currentResult > 0) {
		close_sideBar();
		document.getElementById('sideBar').style.display='inline';
		SIDEBARSIZE='full';
		resize_sideBar();
		document.getElementById('sideBar').style.display='inline';
		document.getElementById('sideBarTitle').innerHTML='';
		
		var historyDiv = document.getElementById('sideBarHistory');
		historyDiv.innerHTML=sideBarHistoryArray[currentResult-1];
		historyDiv.className= historyDiv.className.replace('hidden','shown');
		jsonPisteList = jsonPisteLists[currentResult-1];
		currentResult -= 1;
	}
	if (currentResult == sideBarHistoryArray.length -1 ) {
		document.getElementById("next").style.color='#AAA';
	}else {
		document.getElementById("next").style.color='#444444';
	}
	if (currentResult <= 0 ) {
		document.getElementById("prev").style.color='#AAA';
	}else {
		document.getElementById("prev").style.color='#444444';
	}
	return true;
}
function nextResult(){
	if (currentResult < sideBarHistoryArray.length -1 ) {
		close_sideBar();
		document.getElementById('sideBar').style.display='inline';
		SIDEBARSIZE='full';
		resize_sideBar();
		document.getElementById('sideBar').style.display='inline';
		document.getElementById('sideBarTitle').innerHTML='';
		
		var historyDiv = document.getElementById('sideBarHistory');
		historyDiv.innerHTML=sideBarHistoryArray[currentResult+1];
		historyDiv.className= historyDiv.className.replace('hidden','shown');
		jsonPisteList = jsonPisteLists[currentResult+1];
		currentResult += 1;
	}
	if (currentResult == sideBarHistoryArray.length -1 ) {
		document.getElementById("next").style.color='#AAA';
	}else {
		document.getElementById("next").style.color='#444444';
	}
	if (currentResult <= 0 ) {
		document.getElementById("prev").style.color='#AAA';
	}else {
		document.getElementById("prev").style.color='#444444';
	}
	return true;
}
//======================================================================
// INIT

document.onkeydown = checkKey;

// register 'enter' and 'esc' keyboard hit
function checkKey(e) {
	var keynum;
	if (window.event) keynum = window.event.keyCode; //IE
	else if (e) {
		keynum = e.which;
		if (keynum == undefined)
		{
		e.preventDefault();
		keynum = e.keyCode
		}
	}
	if(keynum == 27) {
		echap();
		}
	if(keynum == 13) {
		// fires nominatim search
		SearchByName(document.search.nom_search.value);
		}
}
function echap() {
	    close_donate()
		close_sideBar();
		// close extendedmenu
		//~ var em = document.getElementById('extendedmenu');
		//~ if (em.style.display == "inline") {
		//~ em.style.display = 'none';
		//~ }
		clearRoute();
		deHighlight();
		abortXHR('GetProfile'); // abort another request if any
		abortXHR('PisteAPI'); // abort another request if any
}
function get_stats(){
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET",server+'data/stats.json');
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var lengthes = JSON.parse(XMLHttp.responseText);
			for (k=0; k< Object.keys(lengthes).length; k++) {
				data[Object.keys(lengthes)[k]]=lengthes[Object.keys(lengthes)[k]];
			}
			show_catcher();
		}
	}
	XMLHttp.send();
	return true;
	
}
function stopRKey(evt) {
	// disable the enter key action in a form.
  var evt = (evt) ? evt : ((event) ? event : null);
  var node = (evt.target) ? evt.target : ((evt.srcElement) ? evt.srcElement : null);
  if ((evt.keyCode == 13) && (node.type=="text"))  {return false;}
}
function page_init(){
		document.onkeypress = stopRKey; 
		get_stats();
		updateZoom();
		initFlags();
		resize_sideBar();
		window.onresize = function(){resize_sideBar();}
		
}
function loadend(){
	updateTooltips();
	if (EXT_MENU) {showMenu();}
	else {closeMenu();}
	
}
//======================================================================
// REQUESTS
function setCenterMap(nlon, nlat, zoom) {
	nlonLat = new OpenLayers.LonLat(nlon, nlat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
	map.setCenter(nlonLat, zoom);
	//document.getElementById('sideBar').style.display='inline';
}

function getByName(name) {
	document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden','shown');
	var q = server+"request?group=true&geo=true&list=true&name="+name;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown','hidden');
			document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden','shown');
			document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('hidden','shown');
			showHTMLPistesList(document.getElementById('piste_search_results'));
			SIDEBARSIZE='full';
			resize_sideBar();
			searchComplete+=1;
			if (searchComplete == 2) {
				cacheInHistory(document.getElementById('search_results').innerHTML);
				searchComplete=0;
			}
		}
	}
	XMLHttp.send();
	return true;
}
function nominatimSearch(name) {
	document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden','shown');
	var q = server+'nominatim?format=json&place='+name;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var nom = JSON.parse(XMLHttp.responseText);
			htmlResponse = '<hr/><ul>\n'
			for (var i=0;i<nom.length;i++) {
				htmlResponse += '<li><a onclick="setCenterMap('
				+ nom[i].lon +','
				+ nom[i].lat +','
				+ 14 +');">'
				+ nom[i].display_name +'</a></li><br/>\n';
			}
			htmlResponse += '</ul> \n <p>Nominatim Search Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"></p>';
			
			
			document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown','hidden');
			document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden','shown');
			document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('hidden','shown');
			document.getElementById('nominatim_results').innerHTML=htmlResponse;
			SIDEBARSIZE='full';
			resize_sideBar();
			searchComplete+=1;
			if (searchComplete == 2) {
				cacheInHistory(document.getElementById('search_results').innerHTML);
				searchComplete=0;
			}
		}
	}
	XMLHttp.send();
	return true;
}

function SearchByName(name) {
	
	if (document.getElementById('searchDiv').style.display=='none' || document.getElementById('searchDiv').style.display=='') {
		document.getElementById('searchDiv').style.display='block';
		document.getElementById("search_input").focus();
		return false;
	}
	if (name == '') {
		document.getElementById('searchDiv').style.display='none';
		return false;
	}
	
	close_sideBar();
	abortXHR('PisteAPI'); // abort another request if any
	abortXHR('GetProfile'); // abort another request if any
	searchComplete=0;
	
	SIDEBARSIZE=100;
	document.getElementById('sideBar').style.display='inline';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('search_results');
	document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('shown','hidden');
	document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('shown','hidden');
	document.search.nom_search.value='';
	getByName(name);
	nominatimSearch(name);
	return true;
}
function getTopoByViewport() { //DONE in pisteList
	close_sideBar();
	abortXHR('PisteAPI'); // abort another request if any
	abortXHR('GetProfile'); // abort another request if any
	SIDEBARSIZE=100;
	document.getElementById('sideBar').style.display='inline';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('search_results');
	document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden','shown');
	document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('shown','hidden');
	document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('shown','hidden');
	
	var bb= map.getExtent().transform(
		new OpenLayers.Projection("EPSG:900913"),
		new OpenLayers.Projection("EPSG:4326"));
	var q = server+"request?group=true&geo=true&list=true&sort_alpha=true&bbox="+bb.left+','+bb.top+','+bb.right+','+bb.bottom;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown','hidden');
			document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden','shown');
			document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('hidden','shown');
			showHTMLPistesList(document.getElementById('piste_search_results'));
			//document.getElementById('piste_search_results').innerHTML=showHTMLPistesList();
			SIDEBARSIZE='full';
			resize_sideBar();
			cacheInHistory(document.getElementById('search_results').innerHTML);
		}
	}
	XMLHttp.send();
	return true;
}
function getMembersById(id) { //DONE in pisteList
	close_sideBar();
	abortXHR('PisteAPI'); // abort another request if any
	
	SIDEBARSIZE=100;
	document.getElementById('sideBar').style.display='inline';
	resize_sideBar();
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('search_results');
	document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden','shown');
	document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('shown','hidden');
	document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('shown','hidden');
	
	var q = server+"request?parent=true&geo=true&list=true&sort_alpha=true&group=true&members="+id;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown','hidden');
			document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden','shown');
			document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('hidden','shown');
			showHTMLPistesList(document.getElementById('piste_search_results'));
			SIDEBARSIZE='full';
			resize_sideBar();
			cacheInHistory(document.getElementById('search_results').innerHTML);
			resize_sideBar();
		}
	}
	XMLHttp.send();

}

function getRouteTopoByWaysId(ids,routeLength) {//DONE in pisteList
	close_sideBar();
	abortXHR('PisteAPI'); // abort another request if any
	SIDEBARSIZE=150;
	document.getElementById('sideBar').style.display='inline';
	resize_sideBar();
	document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('hidden','shown');
	document.getElementById('route_list').className = document.getElementById('route_list').className.replace('shown','hidden');
	document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden','shown');
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('TOPO');
	
	var q = server+"request?geo=true&topo=true&ids_ways="+ids;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			SIDEBARSIZE = 'full';
			document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('shown','hidden');
			document.getElementById('route_list').className = document.getElementById('route_list').className.replace('hidden','shown');
			showHTMLPistesList(document.getElementById('route_list'));
			resize_sideBar();
			searchComplete+=1;
			if (searchComplete == 2) {
				cacheInHistory(document.getElementById('topo').innerHTML);
				searchComplete=0;
			}
		}
	}
	XMLHttp.send();
	return true;
}
function getTopoById(ids,routeLength) {//DONE in pisteList
	close_sideBar();
	abortXHR('PisteAPI'); // abort another request if any
	SIDEBARSIZE=150;
	document.getElementById('sideBar').style.display='inline';
	resize_sideBar();
	document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('hidden','shown');
	document.getElementById('route_list').className = document.getElementById('route_list').className.replace('shown','hidden');
	document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden','shown');
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('TOPO');
	
	var q = server+"request?geo=true&topo=true&ids="+ids;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			SIDEBARSIZE = 'full';
			document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('shown','hidden');
			document.getElementById('route_list').className = document.getElementById('route_list').className.replace('hidden','shown');
			showHTMLPistesList(document.getElementById('route_list'));
			resize_sideBar();
			searchComplete+=1;
			if (searchComplete == 2) {
				cacheInHistory(document.getElementById('topo').innerHTML);
				searchComplete=0;
			}
		}
	}
	XMLHttp.send();
	return true;
}

function getClosestPistes(lonlat){//DONE in pisteList
	close_sideBar();
	
	abortXHR('PisteAPI'); // abort another request if any
	SIDEBARSIZE=150;
	document.getElementById('sideBar').style.display='inline';
	resize_sideBar();
	document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('hidden','shown');
	document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('shown','hidden');
	document.getElementById('route_list').className = document.getElementById('route_list').className.replace('shown','hidden');
	document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden','shown');
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('TOPO');
	
	lonlat.transform(
		new OpenLayers.Projection("EPSG:900913"),
		new OpenLayers.Projection("EPSG:4326"));
	var q = server+"request?geo=true&list=true&closest="+lonlat.lon+','+lonlat.lat;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('shown','hidden');
			addPoint(jsonPisteList.snap);
		}
	}
	XMLHttp.send();
	return true;
}

function getProfile(wktroute) {//DONE in pisteList
	SIDEBARSIZE=150;
	abortXHR('GetProfile'); // abort another request if any
	resize_sideBar();
	document.getElementById('profileWaiter').className = document.getElementById('profileWaiter').className.replace('hidden','shown');
	document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('shown','hidden');
	document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden','shown');
	document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('TOPO');
	
	// request the elevation profile
	
	var XMLHttp = new XMLHttpRequest();
	
	GetProfileXHR.push(XMLHttp); // keep the request to allow aborting
	
	XMLHttp.open("POST", server+"demrequest?");
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			html = '<img src="http://www3.opensnowmap.org/tmp/'+XMLHttp.responseText+'">';
			SIDEBARSIZE = 'full';
			document.getElementById('profileWaiter').className = document.getElementById('profileWaiter').className.replace('shown','hidden');
			//document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('hidden','shown');
			document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('hidden','shown');
			document.getElementById('route_profile').innerHTML=html;
			resize_sideBar();
			searchComplete+=1;
			if (searchComplete == 2) {
				cacheInHistory(document.getElementById('topo').innerHTML);
				searchComplete=0;
			}
		}
	}
	XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	XMLHttp.setRequestHeader("Content-length", wktroute.length);
	XMLHttp.setRequestHeader("Connection", "close");
	
	XMLHttp.send(wktroute);
	return true;
}
function route(){
	
	abortXHR('PisteAPI'); // abort another request if any
	searchComplete=0;
	
	var lls={};
	var lonlats=[];
	for (f in pointsLayer.features) {
		if (pointsLayer.features[f].attributes['userpoint']){
			var wgs84= new OpenLayers.LonLat(
				pointsLayer.features[f].geometry.x,
				pointsLayer.features[f].geometry.y).transform(
					new OpenLayers.Projection("EPSG:900913"),
					new OpenLayers.Projection("EPSG:4326"));
			lls[pointsLayer.features[f].attributes['point_id']]=[wgs84.lon,wgs84.lat];
		}
	}
	// order points in an array
	for (i=1;i<=point_id;i++) {
		var lonlat={};
		if(lls[i]){
			lonlat['lon']=lls[i][0];
			lonlat['lat']=lls[i][1];
			lonlats.push(lonlat);
		}
	}
	linesLayer.destroyFeatures();
	
	var q = '';
	for (pt in lonlats) {
		q = q + lonlats[pt].lat + ';' +lonlats[pt].lon + ',';
	};
	
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", server+'routing?' + q);
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			
			var responseXML=XMLHttp.responseXML;
			if (responseXML==null){
				//removeLastRoutePoint();
				return null;
			}
			if (responseXML.getElementsByTagName('wkt')[0]!=null) {
				var routeWKT = getNodeText(responseXML.getElementsByTagName('wkt')[0]);
				
				var routeIds=getNodeText(responseXML.getElementsByTagName('ids')[0]);
				var routeLength = getNodeText(responseXML.getElementsByTagName('length')[0]);
				
				getRouteTopoByWaysId(routeIds,routeLength);
				
				// show route
				var routeT = new OpenLayers.Geometry.fromWKT(routeWKT);
				var route900913 = routeT.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
				linesLayer.addFeatures(new OpenLayers.Feature.Vector(route900913, {userroute:'true'}));
				//requestInfos(routeIds,routeLength);
				
				getProfile(routeWKT);
			}
			else {
				clearRouteButLast(); // if no route is found, start a new one
				}
			}
		}
	XMLHttp.send();
	return true;
}
function abortXHR(type) {
	// Abort ongoing requests before sending a new one
	// Failing this, long requests results would be displayed over newer faster
	// ones.
	if (type == 'GetProfile') {
		for (var i = 0; i < GetProfileXHR.length; i++) {
			GetProfileXHR[i].abort();
		}
		GetProfileXHR.length = 0;
	}
	else if (type == 'PisteAPI') {
		for (var i = 0; i < PisteAPIXHR.length; i++) {
			PisteAPIXHR[i].abort();
		}
		PisteAPIXHR.length = 0;
	}
	return true;
}

//======================================================================
// MAP

// Redirect permalink
if (location.search != "") {
	readPermalink(location.search);
}
function readPermalink(link) {
	//?zoom=13&lat=46.82272&lon=6.87183&layers=B0TT
	var x = link.substr(1).split("&")
	for (var i=0; i<x.length; i++)
	{
		if (x[i].split("=")[0] == 'zoom') {zoom=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'lon') {lon=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'lat') {lat=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'layers') {BASELAYER=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'marker' && x[i].split("=")[1] == 'true') { MARKER = true;}
		if (x[i].split("=")[0] == 'e') {
			var ext=x[i].split("=")[1];
			if (ext == 'false'){EXT_MENU=false;}
			else if (ext == 'true'){EXT_MENU=true;}
			else {EXT_MENU=false;}
		}
	}
	//Then hopefully map_init() will do the job when the map is loaded
}
function zoomSlider(options) {

	this.control = new OpenLayers.Control.PanZoomBar(options);

	OpenLayers.Util.extend(this.control,{
		draw: function(px) {
			// initialize our internal div
			OpenLayers.Control.prototype.draw.apply(this, arguments);
			px = this.position.clone();

			// place the controls
			this.buttons = [];

			var sz = new OpenLayers.Size(24,24);
			var centered = new OpenLayers.Pixel(px.x+sz.w/2, px.y);
			this._addButton("zoomin", "zoom-plus-mini.png", centered.add(0, 5), sz);
			centered = this._addZoomBar(centered.add(0, sz.h + 5));
			this._addButton("zoomout", "zoom-minus-mini.png", centered, sz);
			return this.div;
		}
	});
	return this.control;
}
function updateZoom() {
	document.getElementById('zoom').innerHTML= map.getZoom();
}
function onZoomEnd(){
	
	ONCE=true;
	if(CATCHER && ONCE){close_sideBar();CATCHER=false;close_donate();}
	//~ if (map.getZoom()<11){
		//~ if (document.getElementById('zoomin-helper')) {
		//~ document.getElementById('zoomin-helper').style.display = 'inline';}
	//~ } else {
		//~ if (document.getElementById('zoomin-helper')) {
		//~ document.getElementById('zoomin-helper').style.display = 'none';}
	//~ }
	if (EDIT_SHOWED){
		if (map.getZoom() < 13) {
		document.getElementById('edit_zoom_in').innerHTML='&nbsp;'+_('zoom_in');
		document.getElementById('permalink.id').href = "javascript:void(0)";  
		document.getElementById('permalink.id').target="";
		document.getElementById('id_pic').src="pics/id-grey-48.png";
		document.getElementById('josm_pic').src="pics/josm-grey-48.png";
		document.getElementById('offseter_pic').src="pics/offseter-grey-48.png";
		}else {
		document.getElementById('edit_zoom_in').innerHTML='';
		document.getElementById('permalink.id').href = "";  
		document.getElementById('permalink.id').target="blank";
		permalink_id.updateLink();
		document.getElementById('permalink.offseter').href = "";  
		document.getElementById('permalink.offseter').target="blank";
		permalink_ofsetter.updateLink();
		document.getElementById('id_pic').src="pics/id-48.png";
		document.getElementById('josm_pic').src="pics/josm-48.png";
		document.getElementById('offseter_pic').src="pics/offseter-48.png";
		}
	}
}
function get_osm_url(bounds) {
	var res = this.map.getResolution();
	var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
	var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
	var z = this.map.getZoom();
	var limit = Math.pow(2, z);

	if (y < 0 || y >= limit) {
		return OpenLayers.Util.getImagesLocation() + "404.png";
	} else {
		x = ((x % limit) + limit) % limit;
		return this.url + z + "/" + x + "/" + y + ".png";
	}
}
function get_tms_url(bounds) {
		var res = this.map.getResolution();
		var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
		var y = Math.round((bounds.bottom - this.tileOrigin.lat) / (res * this.tileSize.h));
		var z = this.map.getZoom();
		var limit = Math.pow(2, z);
		//if (mapBounds.intersectsBounds( bounds ) && z >= mapMinZoom && z <= mapMaxZoom ) {
	  if (y < 0 || y >= limit)
		{
		  return null;
		}
	  else
		{
		  return this.url + z + "/" + x + "/" + y + ".png"; 
		}
	} 
function setBaseLayer(baseLayer){
	var mq=map.getLayersByName("MapQuest")[0];
	var osm=map.getLayersByName("OSM")[0];
	if (baseLayer == "osm" && mq ) {
		map.removeLayer(mq);
		var mapnik = new OpenLayers.Layer.OSM("OSM");
		map.addLayer(mapnik);
		if (document.getElementById('setOSMLayer')) {
			document.getElementById('setOSMLayer').style.border="solid #AAA 2px";
			document.getElementById('setMQLayer').style.border="solid #CCCCCC 1px";
		}
		BASELAYER='osm';
	}
	if (baseLayer == "mapquest" && osm) {
		map.removeLayer(osm);
		var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
			"http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
			"http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
			"http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
		var mapquest = new OpenLayers.Layer.OSM("MapQuest",arrayMapQuest,{visibility: true});
		map.addLayer(mapquest);
		if (document.getElementById('setOSMLayer')) {
			document.getElementById('setMQLayer').style.border="solid #AAA 2px";
			document.getElementById('setOSMLayer').style.border="solid #CCCCCC 1px";
		}
		BASELAYER='mapquest';
	}
	
	var permalinks = map.getControlsByClass("OpenLayers.Control.Permalink");
	for (p = 0; p< permalinks.length; p++){
		permalinks[p].updateLink();
	}
}
function baseLayers() {

// Layer 1.5
	var mapnik = new OpenLayers.Layer.OSM("OSM",{transitionEffect: null});
	//map.addLayer(mapnik);
// Layer 1
	var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
	var mapquest = new OpenLayers.Layer.OSM("MapQuest",
				arrayMapQuest,
				{transitionEffect: null});
	map.addLayer(mapquest);
// Layer 5
	var PistesTiles = new OpenLayers.Layer.XYZ("Pistes Tiles LZ",
	pistes_overlay_URL,{
			getURL: get_osm_url, 
			isBaseLayer: false, numZoomLevels: 19,
			visibility: true, opacity: 1,
				transitionEffect: null
		});
	map.addLayer(PistesTiles);

	highlightLayer = new OpenLayers.Layer.Vector("highlight", {styleMap: HLStyleMap});
	map.addLayer(highlightLayer);

}
function permalink3Args() {
	var args = 
		OpenLayers.Control.Permalink.prototype.createParams.apply(
			this, arguments
		);
	args['layers']=BASELAYER;
	args['marker'] = 'true';
	return args;
}
function permalink2Args() {
	var args = 
		OpenLayers.Control.Permalink.prototype.createParams.apply(
			this, arguments
		);
	args['editor'] = 'potlatch2';
	return args;
}
function permalink1Args() {
	var args = 
		OpenLayers.Control.Permalink.prototype.createParams.apply(
			this, arguments
		);
	args['editor'] = 'id';
	return args;
}
function permalink0Args() {
	var args = 
		OpenLayers.Control.Permalink.prototype.createParams.apply(
			this, arguments
		);
	args['layers']=BASELAYER;
	
	//args['e'] = EXT_MENU;
	args['marker'] = 'false';
	return args;
}
function josmRemote(){
	var bb= map.getExtent().transform(
		new OpenLayers.Projection("EPSG:900913"),
		new OpenLayers.Projection("EPSG:4326"));
	var q = 'http://127.0.0.1:8111/load_and_zoom?left='+bb.left+'&top='+bb.top+'&right='+bb.right+'&bottom='+bb.bottom;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q, true);
	XMLHttp.send();
	
}
function map_init(){
	map = new OpenLayers.Map ("map", {
	zoomMethod: null,
	panMethod: null,
	controls:[
		//new OpenLayers.Control.PanZoomBar(),
		//to avoid shift+right click annoyance:
		new OpenLayers.Control.Navigation({'zoomBoxEnabled' : false }),
		new OpenLayers.Control.TouchNavigation(),
		new OpenLayers.Control.LayerSwitcher(),
		//new OpenLayers.Control.Attribution(),
		new OpenLayers.Control.Permalink('permalink',window.href,{'createParams': permalink0Args}),
		new OpenLayers.Control.MousePosition()],
		maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
		maxResolution: 156543.0399,
		numZoomLevels: 19,
		units: 'm',
		projection: new OpenLayers.Projection("EPSG:900913"),
		displayProjection: new OpenLayers.Projection("EPSG:4326")
	} );
	zoomBar = new zoomSlider({'div':document.getElementById("paneldiv")});
	zoomBar.zoomStopWidth=24;
	map.addControl(zoomBar);
	
	permalink_marker = new OpenLayers.Control.Permalink("permalink.marker",
	server+'index.html',{'createParams': permalink3Args});
	map.addControl(permalink_marker);
	permalink_simple = new OpenLayers.Control.Permalink("permalink.simple",
	server+'index.html',{'createParams': permalink0Args});
	map.addControl(permalink_simple);
	
	baseLayers();
	setBaseLayer(BASELAYER);
// Switch base layer
	map.events.on({ "zoomend": function (e) {
		updateZoom();
		onZoomEnd();
	}
	});

	//################################
	var lonLat = new OpenLayers.LonLat(lon, lat).transform(
		new OpenLayers.Projection("EPSG:4326"),
		new OpenLayers.Projection("EPSG:900913"));
	map.setCenter (lonLat, zoom); 
	//map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.top=0;
	map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.left=0;
	// map.setCenter moved after the strategy.bbox, otherwise it won't load the wfs layer at first load
	map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
	if (MARKER) {
		markerIcon = new OpenLayers.Icon('pics/marker.png',new OpenLayers.Size(20,25),new OpenLayers.Pixel(-12,-30)) 
		var markers = new OpenLayers.Layer.Markers( "Markers" );
		map.addLayer(markers);
		markers.addMarker(new OpenLayers.Marker(map.getCenter(), markerIcon));
	}
	loadend();
}

//======================================================================
// PRINT
function show_printSettings(){
	var z=map.getZoom();
	var center = map.getCenter().transform(new OpenLayers.Projection('EPSG:900913'),new OpenLayers.Projection('EPSG:4326'));
	//#map=4/6/42/0
	var hash="#map="+z+'/'+center.lon+'/'+center.lat+'/0';
	window.open("print.html"+hash,"_blank","height=480,width=685");
}

//======================================================================
// MAP

var linesLayer;
var pointsLayer;
var highlightLayer;
var point_id=0;


var routeStyle = new OpenLayers.Style(
	{
	strokeColor: "${getColor}", 
	strokeDashstyle : "${getDash}",
	strokeLinecap : 'round',
	strokeOpacity: "${getOpacity}",
	graphicZIndex: 18,
	strokeWidth: "${getStroke}",
	pointRadius: "${getSize}",
	fillColor: "${getFill}",
	rotation: "${getRotation}",
	graphicName: "${getSymbol}"
	},
	{context: {
		getColor: function(feature) {
			if ( feature.attributes['userpoint']) {return '#000000'}
			else {return '#000000'}
		},
		getStroke: function(feature) {
			if ( feature.attributes['userpoint']) {return 1}
			else {return 2}
		},
		getDash: function(feature) {
			if ( feature.attributes['userpoint']) {return 'solid'}
			else {return 'dash'}
		},
		getOpacity: function(feature) {
			if ( feature.attributes['userpoint']) {return 0.5}
			else {return 1}
		},
		getFill: function(feature) {
			if ( feature.attributes['start']) {return '#AAAAAA'}
			else if ( feature.attributes['end']) {return '#000000'}
			else if ( feature.attributes['angle']) {return '#000000'}
			else {return '#ffffff'}
		},
		getRotation: function(feature) {
			if ( feature.attributes['angle']) {return feature.attributes['angle']}
			else {return 0}
		},
		getSymbol: function(feature) {
			if ( feature.attributes['angle']) {return "triangle"}
			else {return "circle"}
		},
		getSize: function(feature) {
			if ( feature.attributes['angle']) {return 5}
			else {return 6}
		}
	}
});
var defStyle = new OpenLayers.Style({strokeColor: "#FF0000", strokeWidth: 2, fillColor: "#FF0000", pointRadius: 5});
var tmpStyle = new OpenLayers.Style({display: "none"});
var myStyleMap = new OpenLayers.StyleMap({"default": routeStyle, "temporary": tmpStyle});

var HLStyle = new OpenLayers.Style({
	strokeColor: "#26CDFF",
	strokeWidth: 20,
	fillColor: "#FFFFFF",
	strokeOpacity:"${getOpacity}",
	fillOpacity:0.3
	},{
		context: {
		getOpacity: function(feature) {
			if ( map.getZoom()>10) {return 0.3}
			else {return 0.7}
		}
	}
});
var HLStyleMap = new OpenLayers.StyleMap({"default": HLStyle});

function getNodeText(node) {
	//workaround for browser limit to 4096 char in xml nodeValue
	var r = "";
	for (var x = 0;x < node.childNodes.length; x++) {
		r = r + node.childNodes[x].nodeValue;
	}
	return r;
}

function zoomToElement(osm_id, type){
	//type is either 'pistes' or 'sites'
	var element=null;
	for (p in jsonPisteList[type]) {
		var ids=jsonPisteList[type][p].ids.join('_').toString();
		if (ids == osm_id ){
			element=jsonPisteList[type][p];
			break;
		}
	}
	if (! element) {return false;}
	
	var bbox= element.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
}
function zoomToParentSite(osm_id,r){
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_sites[r];
	
	if (! parent) {return false;}
	
	var bbox= parent.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
	//~ var encPol= new OpenLayers.Format.EncodedPolyline();
	//~ var geometry=parent.geometry;
	//~ var features=[];
	//~ for (g in geometry) {
		//~ var escaped=geometry[g];
		//~ encPol.geometryType='polygon';
		//~ var feature = encPol.read(escaped);
		//~ feature.attributes.polygon=true;
		//~ feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		//~ features.push(feature);
	//~ }
	//~ 
	//~ highlightLayer.destroyFeatures();
	//~ highlightLayer.addFeatures(features);
	
}
function zoomToParentRoute(osm_id,r){
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_routes[r];
	
	if (! parent) {return false;}
	
	var bbox= parent.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
	//~ var encPol= new OpenLayers.Format.EncodedPolyline();
	//~ var geometry=parent.geometry;
	//~ var features=[];
	//~ for (g in geometry) {
		//~ var escaped=geometry[g];
		//~ var feature = encPol.read(escaped);
		//~ feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		//~ features.push(feature);
	//~ }
	//~ 
	//~ highlightLayer.destroyFeatures();
	//~ highlightLayer.addFeatures(features);
	
}

function deHighlight() {
	if (highlightLayer) {highlightLayer.destroyFeatures();}
	return true;
}
function highlightElement(osm_id, type){
	//type is either 'pistes' or 'sites'
	var element=null;
	for (p in jsonPisteList[type]) {
		var ids=jsonPisteList[type][p].ids.join('_').toString();
		if (ids == osm_id ){
			element=jsonPisteList[type][p];
			break;
		}
	}
	if (! element) {return false;}
	highlightGeom(element.geometry,'piste');
	return true;
}
function highlightParentSite(osm_id,r){
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_sites[r];
	
	if (! parent) {return false;}
	highlightGeom(parent.geometry,'site');
	return true;
	
}
function highlightParentRoute(osm_id,r){
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_routes[r];
	
	if (! parent) {return false;}
	highlightGeom(parent.geometry,'route');
	return true;
	
}

function highlightGeom(geometry, type) {
	
	var encPol= new OpenLayers.Format.EncodedPolyline();
	var features=[];
	for (g in geometry) {
		var escaped=geometry[g];
		
		if (type=='sites'){encPol.geometryType='polygon';}
		else {encPol.geometryType='linestring';}
		var feature = encPol.read(escaped);
		
		if (type=='sites'){feature.attributes.polygon=true;}
		
		feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		features.push(feature);
	}
	
	highlightLayer.destroyFeatures();
	highlightLayer.addFeatures(features);
	return true;
}

function drawGeomAsRoute(geometry, type) {
	if (mode == "raster") {infoMode();}
	
	var encPol= new OpenLayers.Format.EncodedPolyline();
	var features=[];
	for (g in geometry) {
		var escaped=geometry[g];
		
		encPol.geometryType='linestring';
		var feature = encPol.read(escaped);
		
		feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		features.push(feature);
		
		if (g == 0) {
			var pts = feature.geometry.getVertices(); 
			pointsLayer.destroyFeatures();
			var start = new OpenLayers.Feature.Vector(pts[0],{userpoint:true, point_id: point_id+1, start : true})
			point_id=point_id+1;
			var end = new OpenLayers.Feature.Vector(pts[pts.length-1],{userpoint:true, point_id: point_id+1, end : true})
			point_id=point_id+1;
			
			
			if (pts[1].y > pts[0].y ) {
				var angle =  Math.atan((pts[0].x - pts[1].x) / (pts[0].y - pts[1].y))*180/3.1416;
			} else {
				var angle = 180 + Math.atan((pts[0].x - pts[1].x) / (pts[0].y - pts[1].y))*180/3.1416;
			}// atan give a result between -pi/2 and pi/2
			
			
			var dir = new OpenLayers.Feature.Vector(pts[1],{userpoint:true, angle: angle})
			
			pointsLayer.addFeatures([start,end, dir]);
			
		}
	}
	
	linesLayer.destroyFeatures();
	linesLayer.addFeatures(features, {userroute:'true'});
	return true;
	
}

function encpolArray2WKT(encpol) {
	var wktGeom;
	var l=0;
	var encPol= new OpenLayers.Format.EncodedPolyline();
	encPol.geometryType='linestring';
	
	var wkt=new OpenLayers.Format.WKT();
	
	if (encpol.length == 1) {
		var feature = encPol.read(encpol[0]);
		wktGeom = wkt.write(feature);
		l+=feature.geometry.getGeodesicLength(new OpenLayers.Projection("EPSG:4326"))/1000;
	} 
	else if (encpol.length > 1) {
		wktGeom='MULTILINESTRING(';
		for (i in encpol) {
			var feature = encPol.read(encpol[i]);
			var linestring = wkt.write(feature);
			wktGeom += linestring.replace('LINESTRING','')+',';
			l+=feature.geometry.getGeodesicLength(new OpenLayers.Projection("EPSG:4326"))/1000;
		}
		wktGeom =wktGeom.substring(0,wktGeom.length-1)+')';
	}
	
	return {geom: wktGeom, length_km: l}
}
function showProfileFromGeometryParentRoute(osm_id,r) {
	if (mode == "raster") {infoMode();}
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_routes[r];
	
	if (! parent) {return false;}
	
	
	drawGeomAsRoute(parent.geometry,'route');
	
	var wkt = encpolArray2WKT(parent.geometry)
	
	
	searchComplete=0;
	getTopoById(parent.id,wkt.length_km);
	getProfile(wkt.geom);
	return true;
}
function showProfileFromGeometry(osm_id, type) {
	if (mode == "raster") {infoMode();}
	
	//type is either 'pistes' or 'sites'
	var element=null;
	for (p in jsonPisteList[type]) {
		var ids=jsonPisteList[type][p].ids.join('_').toString();
		if (ids == osm_id ){
			element=jsonPisteList[type][p];
			break;
		}
	}
	if (! element) {return false;}
	
	drawGeomAsRoute(element.geometry,'piste');
	
	var wkt = encpolArray2WKT(element.geometry)
	
	
	searchComplete=0;
	getTopoById(osm_id.split('_').join(','),wkt.length_km);
	getProfile(wkt.geom);
	return true;
}

function addPoint(lonlat){
	
	abortXHR('GetProfile'); // abort another request if any
	abortXHR('PisteAPI'); // abort another request if any
	
	// create the point geometry
	var pt = new OpenLayers.Feature.Vector(
				new OpenLayers.Geometry.Point(lonlat.lon,lonlat.lat).transform(
					new OpenLayers.Projection("EPSG:4326"),
					new OpenLayers.Projection("EPSG:900913")),
							{userpoint:true, point_id: point_id+1, end : true});
							
	if (pointsLayer.features.length == 0){pt.attributes['start']=true;}
	else {pointsLayer.features[pointsLayer.features.length-1].attributes['end']=false;}
	
	pointsLayer.addFeatures([pt]);
	pointsLayer.redraw();
	point_id=point_id+1;
	
	if (pointsLayer.features.length >1){route();}
	else {
		document.getElementById('route_list').className = document.getElementById('route_list').className.replace('hidden','shown');
		showHTMLPistesList(document.getElementById('route_list'));
		cacheInHistory(document.getElementById('topo').innerHTML)
	}
	return true;
}

function removePoint(f){
	var id=f.attributes['point_id'];
	f.destroy();
	route();
}

function clearRoute() {
	if (pointsLayer) {pointsLayer.destroyFeatures();}
	if (linesLayer) {linesLayer.destroyFeatures();}
	return true;
}
function clearRouteButLast(){
	for (f in pointsLayer.features) {
		if(pointsLayer.features[f].attributes['point_id'] == point_id){
			var tokeep=new OpenLayers.LonLat(
				pointsLayer.features[f].geometry.x,
				pointsLayer.features[f].geometry.y);
		}
	}
	clearRoute();
	addPoint(tokeep.transform(
					new OpenLayers.Projection("EPSG:900913"),
					new OpenLayers.Projection("EPSG:4326")));
	return true;
}

function new_window() {
printWindow=window.open('print.html');
printWindow.document.write(
'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html>\n'
+'<head>\n'
		+'<meta name="http-equiv" content="Content-type: text/html; charset=UTF-8"/>\n'
		+'<title>Topo Ski Nordique / Nordic Ski Topo</title>\n'
		+'<link rel="stylesheet" href="main.css" media="print" />\n'
		+'<link rel="stylesheet" href="main.css" media="screen" />\n'
+'</head>\n'
+'<body>\n');

printWindow.document.write(document.getElementById('topo').innerHTML);
//printWindow.document.write(document.getElementById('contextual2').innerHTML);
printWindow.document.write('<p></p><img src="pics/pistes-nordiques-238-45.png">');
printWindow.document.write(document.getElementById('attributions').innerHTML);
printWindow.document.write('\n</body></html>');
}

function onMapClick(e) {
	if(map.getZoom() >10) {
		var lonlat = map.getLonLatFromPixel(e.xy);
		//first check pixel distance with existing features to robustify
		var px = map.getViewPortPxFromLonLat(lonlat)
		for(f in pointsLayer.features) {
			var fx=map.getViewPortPxFromLonLat(new OpenLayers.LonLat([
				pointsLayer.features[f].geometry.x,
				pointsLayer.features[f].geometry.y
				]));
			if (Math.abs(fx.x - px.x) + Math.abs(fx.y - px.y) <10){return false;}
		}
		
		getClosestPistes(lonlat);
	} /*else {
		show_helper();
	}*/
}
function vectorLayers() {

linesLayer = new OpenLayers.Layer.Vector("lines", {styleMap: myStyleMap});
map.addLayer(linesLayer);

pointsLayer = new OpenLayers.Layer.Vector("points", {styleMap: myStyleMap});
map.addLayer(pointsLayer);

modifyControl = new OpenLayers.Control.ModifyFeature(
	pointsLayer, {autoActivate: true}
);

map.addControl(modifyControl);
modifyControl.activate();

modifyControlLines = new OpenLayers.Control.ModifyFeature(
	linesLayer, {autoActivate: true}
);

map.addControl(modifyControlLines);
modifyControlLines.activate();

pointsLayer.events.on({
	'featuremodified': function(f){
							if(map.getZoom() >10) {route();}
						}
});

var deleteHandler = new OpenLayers.Handler.Click(
	modifyControl,  // The select control
	{ dblclick: function(evt){
		if(map.getZoom() >10) {
			var feat = this.layer.getFeatureFromEvent(evt);
			if(feat){removePoint(feat);}
		}
		}
	},
	{  single: false,
		double: true,
		stopDouble: true,
		stopSingle: false
	}
);
deleteHandler.activate();

map.events.register("click", map, onMapClick);
}

function makeWASHTMLPistesList(length) {
	
	//var html='\n<div style="font-size:0.7em;">\n';
	var html ='\n<div class="clear"></div>'
	html+='\n'
	if(typeof(length)!=='undefined') {
		html +='<div><b style="font-size:1em;">'+parseFloat(length).toFixed(1)+' km</b></div>'
		}
	if (jsonPisteList['sites'] != null) {
		
		for (p in jsonPisteList['sites']) {
			
			var site=jsonPisteList['sites'][p];
			var index;
			index=site.result_index;
			
			var osm_id;
			osm_id=site.ids.join('_').toString(); // What to do with that '_' ?
			
			var name = site.name;
			if (name==' '){name=' x ';}
			
			var element_type='';
			if (site.type) {element_type=site.type;}
			
			html+='<div class="pisteListElement">\n ';
			
				// ---- info button-----
				html+='<div class="Button" style="float:right;" '
				html+='onClick="showSiteStats(this,\''+osm_id+'\',\''+element_type+'\');'
				html+='showExtLink(this,\''+osm_id+'\',\''+element_type+'\');">';
				html+='<img src="pics/info-flat22.png"></div>\n';
				// ---- list button-----
				html+='<div class="Button" style="float:right;" '
				html+='onClick="getMembersById('+osm_id+');deHighlight();">'
				html+='<img src="pics/list-flat22.png"></div>\n';
			
				html+='<div class="pisteListButton"';
				html+='onClick="zoomToElement(\''+osm_id+'\',\'sites\')" ';
				html+='onmouseover="highlightElement(\''+osm_id+'\',\'sites\');" ';
				html+='onmouseout="deHighlight();">\n';
				
				var pic;
				if (site.pistetype) {
					var types=site.pistetype.split(';');
					for (t in types) {
						pic =icon[types[t]];
						if (pic) {
							html+='<img src="'+pic+'" style="vertical-align: middle;">&nbsp;\n';
						}
					}
				}
				
				html+='	&nbsp;<b >'+name+'</b>\n';
				
				html+='\n<div class="clear"></div>'
				html+='\n</div>'// pisteListButton
				
				// more infos
				html+='<div class="siteStats" style="display:none;"></div>';
				html+='<div class="elementExtLink" style="display:none;"></div>';
				//~ html+='<div class="stats"></div>';
				//~ 
				//~ if (site.type) {
					//~ html+='<p style="margin-left:20px;">';
					//~ html+=element_type+'&nbsp;<a target="blank" href="http://openstreetmap.org/browse/'+element_type+'/'+osm_id+'">';
					//~ html+='&nbsp;'+osm_id+'&nbsp;<img src="pics/external-flat22.png">';
					//~ html+='</a>';
					//~ html+='</p>';
				//~ }
				//~ html+='\n</div>'
				
			html+='\n</div>' //pisteListElement
			html+='<hr class="light">';
		}
	}
	html+='\n<hr>'
	if (jsonPisteList['pistes'] != null) {
		
		for (p in jsonPisteList['pistes']) {
			
			var piste=jsonPisteList['pistes'][p];
			
			var osm_ids;
			osm_ids=piste.ids.join('_').toString();
			
			var pic;
			if (piste.pistetype) {pic =icon[piste.pistetype];}
			else {pic =icon[piste.aerialway];}
			if (piste.type) {element_type=piste.type;}
			var color='';
			if (piste.color) {
				color ='&nbsp;<b style="color:'+piste.color+';font-weight:900;">&nbsp;&#9679; </b>';
			}
			
			var lon = piste.center[0];
			var lat = piste.center[1];
			
			var difficulty='';
			if (piste.difficulty) {
				var marker = '&#9679;'
				if (lat>0 && lon <-40) {
					if (piste.difficulty =='expert') {marker = '&diams;';}
					if (piste.difficulty =='advanced') {marker = '&diams;&diams;';}
					if (piste.difficulty =='freeride') {marker = '!!';}
					difficulty='&nbsp;('+_(piste.difficulty)+'<b style="color:'+diffcolorUS[piste.difficulty]+';font-weight:900;">&nbsp;'+marker+'&nbsp;</b>)';
				}
				else {
					if (piste.difficulty =='freeride') {marker = '!';}
					difficulty='&nbsp;('+_(piste.difficulty)+'<b style="color:'+diffcolor[piste.difficulty]+';font-weight:900;">&nbsp;'+marker+'&nbsp;</b>)';
				}
			}
			
			var name = piste.name;
			if (name==' '){name=' - ';}
			
			html+='<div class="pisteListElement">\n';
				// ---- profile button-----
				html+='<div class="Button" style="float:right;" '
				html+='onClick="zoomToElement(\''+osm_ids+'\',\'pistes\');'
				html+='showProfileFromGeometry(\''+osm_ids+'\',\'pistes\');">'
				html+='<img src="pics/profile-flat22.png"></div>\n';
				// ---- info button-----
				html+='<div class="Button" style="float:right;" '
				html+='onClick="showExtLink(this,\''+osm_ids+'\',\''+element_type+'\');">'
				html+='<img src="pics/info-flat22.png"></div>\n';
			
				html+='<div class="pisteListButton" '
				html+='onClick="zoomToElement(\''+osm_ids+'\',\'pistes\'); '
				html+='deHighlight();" '
				html+='onmouseover="highlightElement(\''+osm_ids+'\',\'pistes\');" '
				html+='onmouseout="deHighlight();">\n'
				
				if (pic) {
					html+='&nbsp;<img src="'+pic+'" style="float:left;vertical-align: middle;">&nbsp;\n';
				}
				
				html+='	<div style="float:left;">&nbsp;'+color+name+difficulty+'</div>\n';
				
				html+='\n<div class="clear"></div>\n'
				html+='\n</div>'; //pisteListButton
			
			
			html+='\n<div class="clear"></div>\n'
			// parent routes
			if (piste.in_routes.length != 0) {
				
				for (r in piste.in_routes) {
					html+='<div class="inRouteElement pisteListButton" style="float:left;" '
					html+='onClick="deHighlight();showProfileFromGeometryParentRoute(\''+osm_ids+'\','+r+')"'
					html+='onmouseover="highlightParentRoute(\''+osm_ids+'\','+r+');" '
					html+='onmouseout="deHighlight();">\n';
					var color;
					if (piste.in_routes[r].color) {color =piste.in_routes[r].color;}
					else {color =diffcolor[piste.in_routes[r].difficulty];}
					
					var name = piste.in_routes[r].name;
					if (name==' '){name=' ? ';}
					if (color){
					html+='	&nbsp;<b style="color:'+color+';font-weight:900;">&nbsp;&#9679 </b>'+name+'&nbsp;\n';
					html+='	<img src="pics/profile-flat22.png" style="vertical-align:middle;">';
					} else {
					html+='	&nbsp;<b style="color:#000000;font-weight:900;">&nbsp;&#186; </b>'+name+'&nbsp;\n';
					html+='	<img src="pics/profile-flat22.png" style="vertical-align:middle;">';
					}
					
					
					html+='</div>\n'; //inRouteElement
				}
				
			}
			html+='\n<div class="clear"></div>\n'
			// parent sites
			if (piste.in_sites.length != 0) {
				
				for (r in piste.in_sites) {
					
					html+='<div class="inSiteElement pisteListButton" style="float:right;"' 
					html+='onClick="zoomToParentSite(\''+osm_ids+'\','+r+'); '
					html+='deHighlight();'
					html+='getMembersById('+piste.in_sites[r].id+');" '
					html+='onmouseover="highlightParentSite(\''+osm_ids+'\','+r+');" '
					html+='onmouseout="deHighlight();">\n'
					var name = piste.in_sites[r].name;
					if (name==' '){name=' ? ';}
					html+='<b>'+name+'</b>\n';
					html+='	<img src="pics/list-flat22.png" style="vertical-align:middle;">';
					html+='</div>\n' // inSiteElement
				}
			}
			
			html+='\n<div class="clear"></div>\n';
			// more infos
			html+='<div class="elementExtLink " style="display:none;"></div>';
			/*html+='<div class="stats"></div>';
			html+='<p style="margin-left:20px;">';
			var element_type=piste.type;
			for (i in piste.ids) {
				osm_id=piste.ids[i];
				html+=element_type+'&nbsp;<a target="blank" href="http://openstreetmap.org/browse/'+element_type+'/'+osm_id+'">';
				html+='&nbsp;'+osm_id+'&nbsp;<img src="pics/external-flat22.png">';
				html+='</a><br/>';
				if (element_type == 'relation'){
					html+='analyse &nbsp;<a target="blank" href="http://ra.osmsurround.org/analyzeRelation?relationId=+'+osm_id+'&_noCache=on">';
					html+='&nbsp;'+osm_id+'&nbsp;<img src="pics/external-flat22.png">';
					html+='</a><br/>';
				}
			}
			
			html+='</p>';
			html+='\n</div>';*/
			
		html+='\n</div>\n'; // pisteListElement
		html+='<hr class="light">';
		}
	}
	
	if (jsonPisteList['limit_reached']) {
		html+='<p>'+jsonPisteList['info']+'</p>\n'
	}
	html+='\n</div>'
	
	return html
}
function showHTMLPistesList(Div) {
	
	
	//~ if(typeof(length)!=='undefined') {
		//~ html +='<div><b style="font-size:1em;">'+parseFloat(length).toFixed(1)+' km</b></div>'
		//~ }
	
	while (Div.firstChild) {
			    Div.removeChild(Div.firstChild);
	} //clear previous list
	
	if (jsonPisteList['sites'] != null) {
		
		for (p in jsonPisteList['sites']) {
			
			var site=jsonPisteList['sites'][p];
			var index;
			index=site.result_index;
			
			var osm_id;
			osm_id=site.ids.join('_').toString(); // What to do with that '_' for sites ??
			
			var name = site.name;
			if (name==' '){name=' x ';}
			
			var element_type='';
			
			if (site.type) {element_type=site.type;}
			
			
			var sitediv = document.getElementById('pisteListElementProto').cloneNode(true);
			
			sitediv.removeAttribute("id");
			sitediv.osm_id=osm_id;
			sitediv.element_type=element_type;
			
			sitediv.getElementsByClassName("getProfileButton")[0].style.display='none';
			
			sitediv.getElementsByClassName("moreInfoButton")[0].onclick= function(e){
				showSiteStats(this.parentNode,this.parentNode.osm_id,this.parentNode.element_type);
				showExtLink(this.parentNode,this.parentNode.osm_id,this.parentNode.element_type);
				};
			
			sitediv.getElementsByClassName("getMemberListButton")[0].onclick= function(e){
				getMembersById(this.parentNode.osm_id);
				};
			
			sitediv.onmouseout= function(){
				deHighlight();
			}
			
			sitediv.onmouseover= function(){
				highlightElement(this.osm_id,'sites');
			};
			
			sitediv.onclick= function(){
				zoomToElement(this.osm_id,'sites');
				deHighlight();
			};
			Div.appendChild(sitediv);
			
			spans = sitediv.getElementsByTagName('span');
			for (i=0; i< spans.length; i++) {
				var span = spans[i] 
				if (span.className=="routeColorSpan") {span.style.display='none';}
				if (span.className=="pisteNameSpan") {span.style.display='none';}
				if (span.className=="siteNameSpan") {
					span.innerHTML=name;//+' '+osm_id;
					}
				if (span.className=="difficultySpan") {span.style.display='none';}
				if (span.className=="difficultyColorSpan") {span.style.display='none';}
			}
			
			var pic;
			var picDiv = sitediv.getElementsByClassName("pisteIconDiv")[0];
			picDiv.innerHTML='';
			if (site.pistetype) {
				var types=site.pistetype.split(';');
				for (t in types) {
					pic =icon[types[t]];
					if (pic) {
						var img=document.createElement('img');
						img.src=pic;
						img.className='pisteIcon';
						picDiv.appendChild(img);
						//html+='<img src="'+pic+'" style="vertical-align: middle;">&nbsp;\n';
					}
				}
			}
			
			sitediv.getElementsByClassName("diffInfos")[0].style.display='none';
			
			var hrDiv = document.getElementById('hrLightProto').cloneNode(true);
			hrDiv.removeAttribute("id");
			Div.appendChild(hrDiv);
			
		}
	}
	
	if (jsonPisteList['pistes'] != null) {
		
		for (p in jsonPisteList['pistes']) {
			var piste=jsonPisteList['pistes'][p];
			
			var osm_ids;
			osm_ids=piste.ids.join('_').toString();
			
			//~ var pic;
			//~ if (piste.pistetype) {pic =icon[piste.pistetype];}
			//~ else {pic =icon[piste.aerialway];}
			if (piste.type) {element_type=piste.type;}
			var color='';
			if (piste.color) {
				color = piste.color;//'&nbsp;<b style="color:'+piste.color+';font-weight:900;">&nbsp;&#9679; </b>';
			}
			
			var lon = piste.center[0];
			var lat = piste.center[1];
			
			var difficulty='';
			if (piste.difficulty) {difficulty=piste.difficulty;}
			
			var name = piste.name;
			if (name==' '){name=' - ';}
			
			var pistediv = document.getElementById('pisteListElementProto').cloneNode(true);
			
			pistediv.removeAttribute("id");
			pistediv.osm_id=osm_ids;
			pistediv.element_type=element_type;
			
			pistediv.getElementsByClassName("getProfileButton")[0].onclick= function(e){
				zoomToElement(this.parentNode.osm_id,'pistes');
				showProfileFromGeometry(this.parentNode.osm_id,'pistes');
				};
			
			pistediv.getElementsByClassName("moreInfoButton")[0].onclick= function(e){
				showExtLink(this.parentNode,this.parentNode.osm_id,this.parentNode.element_type);
				};
			
			pistediv.getElementsByClassName("getMemberListButton")[0].style.display='none';
			
			var buttondiv = pistediv.getElementsByClassName("pisteListButton")[0]
			buttondiv.onmouseout= function(){
				deHighlight();
			}
			
			buttondiv.onmouseover= function(){
				highlightElement(this.parentNode.osm_id,'pistes');
			};
			
			buttondiv.onclick= function(){
				zoomToElement(this.parentNode.osm_id,'pistes');
				deHighlight();
			};
			Div.appendChild(pistediv);
			
			spans = pistediv.getElementsByTagName('span');
			for (i=0; i< spans.length; i++) {
				var span = spans[i] 
				if (span.className=="routeColorSpan") {
					if (piste.color) {span.style.color=piste.color;}
					else {span.style.display='none';}
					}
				if (span.className=="pisteNameSpan") {
					span.innerHTML=name;
					}
				if (span.className=="siteNameSpan") {span.style.display='none';}
				if (span.className=="difficultySpan") {
					span.innerHTML=_(piste.difficulty);
					}
				if (span.className=="difficultyColorSpan") {
					if (piste.difficulty) {
						var marker = '&#9679;'
						if (piste.difficulty =='freeride') {marker = '!';}
						if (lat>0 && lon <-40) {
							if (piste.difficulty =='expert') {marker = '&diams;';}
							if (piste.difficulty =='advanced') {marker = '&diams;&diams;';}
							if (piste.difficulty =='freeride') {marker = '!!';}
							span.style.color=diffcolorUS[piste.difficulty];
						} else {
							span.style.color=diffcolor[piste.difficulty];
						}
						span.innerHTML=marker;

					} else {span.style.display='none';}
				}
			}
			
			var pic;
			var picDiv = pistediv.getElementsByClassName("pisteIconDiv")[0];
			picDiv.innerHTML='';
			var pic =null;
			if (piste.pistetype) {
				var pic =icon[piste.pistetype];
			} else {
				var pic =icon[piste.aerialway];
			}
			if (pic) {
				var img=document.createElement('img');
				img.src=pic;
				img.className='pisteIcon';
				picDiv.appendChild(img);
			}
			
			if (! piste.pistetype) {
				pistediv.getElementsByClassName("diffInfos")[0].style.display='none';
			}
			if (piste.difficulty && piste.difficulty.split(',').length > 1) {
				pistediv.getElementsByClassName("diffInfos")[0].style.display='none';
			}
			
			var cleardiv = document.getElementById('clearProto').cloneNode(true);
			cleardiv.removeAttribute("id");
			pistediv.appendChild(cleardiv);
			// parent routes
			if (piste.in_routes.length != 0) {
				
				for (r in piste.in_routes) {
					
					var color='';
					if (piste.in_routes[r].color) {color =piste.in_routes[r].color;}
					else {color =diffcolor[piste.in_routes[r].difficulty];}
					
					var routeName = piste.in_routes[r].name;
					var inroutediv = document.getElementById('inRouteElementProto').cloneNode(true);
					
					inroutediv.removeAttribute("id");
					inroutediv.osm_id=osm_ids;
					inroutediv.element_type=element_type;
					inroutediv.r=r;
					
					inroutediv.onmouseout= function(){
						deHighlight();
					}
					
					inroutediv.onmouseover= function(){
						highlightParentRoute(this.osm_id,this.r);
					};
					
					inroutediv.onclick= function(){
						showProfileFromGeometryParentRoute(this.osm_id,this.r);
						deHighlight();
					};
					pistediv.appendChild(inroutediv);
					
					spans = inroutediv.getElementsByTagName('span');
					for (i=0; i< spans.length; i++) {
						var span = spans[i] 
						if (span.className=="routeNameSpan") {
							span.innerHTML=routeName;
							}
						if (span.className=="routeColorSpan") {
							if (color !='') {span.style.color=color;}
							else {span.style.display='none';}
							}
						}
						
					}
					
					
				}
			
			
			// parent sites
			if (piste.in_sites.length != 0) {
				
				for (r in piste.in_sites) {
					var siteId = piste.in_sites[r].id;
					var siteName = piste.in_sites[r].name;
					var insitediv = document.getElementById('inSiteElementProto').cloneNode(true);
					
					insitediv.removeAttribute("id");
					insitediv.osm_id=osm_ids;
					insitediv.parent_site_id=siteId;
					insitediv.element_type=element_type;
					
					insitediv.onmouseout= function(){
						deHighlight();
					}
					
					insitediv.onmouseover= function(){
						highlightParentSite(this.osm_id,r);
					};
					
					insitediv.onclick= function(){
						zoomToParentSite(this.osm_id,r);
						deHighlight();
						getMembersById(this.parent_site_id);
					};
					pistediv.appendChild(insitediv);
					spans = pistediv.getElementsByTagName('span');
					for (i=0; i< spans.length; i++) {
						var span = spans[i] 
						if (span.className=="siteNameSpan") {
							span.innerHTML=siteName;
							}
						}
					}
				}
			
			
			var cleardiv = document.getElementById('clearProto').cloneNode(true);
			cleardiv.removeAttribute("id");
			Div.appendChild(cleardiv);
			
			var hrDiv = document.getElementById('hrLightProto').cloneNode(true);
			hrDiv.removeAttribute("id");
			Div.appendChild(hrDiv);

		} // end for
	
	}
	
}
function showSiteStats(div, id, element_type) { // fix for normal ways
	
	var child = div.getElementsByClassName('siteStats')[0]
	if (child == null) {
		var statsdiv = document.getElementById('siteStatsProto').cloneNode(true);
		statsdiv.removeAttribute("id");
		div.appendChild(statsdiv);
		
		
		abortXHR('PisteAPI'); // abort another request if any
		
		var q = server+"request?site-stats="+id;
		var XMLHttp = new XMLHttpRequest();
		
		PisteAPIXHR.push(XMLHttp);
		
		XMLHttp.open("GET", q);
		XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
		
		XMLHttp.onreadystatechange= function () {
			if (XMLHttp.readyState == 4) {
				var resp=XMLHttp.responseText;
				var jsonStats = JSON.parse(resp);
				statsdiv.getElementsByClassName('stats')[0].className.replace('hidden','shown');
				
				fillHTMLStats(jsonStats, statsdiv, id, element_type)
			}
		}
		XMLHttp.send();
	} else {
		child.parentNode.removeChild(child);
	}
}
function fillHTMLStats(jsonStats, div, element_type) {
	
	
	spans = div.getElementsByClassName('data');
	for (i=0; i< spans.length; i++) {
		var data = spans[i].getAttribute('dataText')
		if (jsonStats['site'] != null) {
			if (['downhill','nordic','skitour','sled','lifts','hike'].indexOf(data)!= -1) {
				spans[i].innerHTML=(parseFloat(jsonStats[data])/1000).toFixed(1);
			} 
			if (['snow_park','jump','playground','sleigh','ice_skate'].indexOf(data)!= -1){
				if (jsonStats[data] != 0) {
					spans[i].innerHTML='&#9679;';
					spans[i].style.color='green';
				}
				else {
					spans[i].innerHTML='x';
					spans[i].style.color='red';
				}
			}
		}
		if (data == 'siteUrl'){
			spans[i].href="http://openstreetmap.org/browse/"+element_type+"/"+id;
		}
		if (data == 'siteId'){
			spans[i].innerHTML=id;
		}
		if (data == 'siteType'){
			spans[i].innerHTML=element_type; //way or relation
		}
	}
	
}

function showExtLink(div, ids, element_type) {
	
	var child = div.getElementsByClassName('elementExtLink')[0]
	if (child == null) {
		
		ids = ids.split('_');
		
		for (k = 0; k< ids.length; k++) {
			var id= ids[k];
			var linkdiv = document.getElementById('elementExtLinkProto').cloneNode(true);
			linkdiv.removeAttribute("id");
			div.appendChild(linkdiv);
			linkdiv.className.replace('shown','hidden');
			if (element_type == 'relation') {
				linkdiv.getElementsByClassName('analyse')[0].className.replace('hidden','shown');
				linkdiv.getElementsByClassName('analyse')[0].style.display='inline';
			}
			spans = linkdiv.getElementsByClassName('data');
			for (i=0; i< spans.length; i++) {
				var data = spans[i].getAttribute('dataText')
				
				if (data == 'siteUrl'){
					spans[i].href="http://openstreetmap.org/browse/"+element_type+"/"+id;
				}
				if (data == 'siteId'){
					spans[i].innerHTML=id;
				}
				
				if (data == 'siteType'){
					spans[i].innerHTML=element_type; //way or relation
				}
				if (data == 'analyseUrl'){
					spans[i].href="http://ra.osmsurround.org/analyzeRelation?relationId=+"+id;
				}
			}
			
		}
	
	} else {
		child.parentNode.removeChild(child);
	}
}

//======================================================================
// I18N
var locs = [ "ast","cz","de","en","es","cat","fi","fr","hu","it","jp","nl","nn","ru","se","ukr"];
var iloc= 0;
var locale;
var iframelocale;
locale="en"; //set default
//localization

// Get the locale first: from localstorage if set
if (localStorage.l10n) {
	locale = localStorage.l10n;
}
// No localstorage, check for browser locale
else {locale = get_locale().split('-')[0];} //return only 'en' from 'en-us'

// only a few iframe content pages are translated:
if (locale != 'en' && locale !='fr') { iframelocale = 'en';}
else { iframelocale = locale;}

/*
// Load the localized strings
var oRequest = new XMLHttpRequest();
oRequest.open("GET",'i18n/'+locale+'.json',false);
//~ oRequest.setRequestHeader("User-Agent",navigator.userAgent);
oRequest.send();
var i18n = eval('('+oRequest.responseText+')');
// Load the default strings
var oRequest = new XMLHttpRequest();
oRequest.open("GET",'i18n/en.json',false);
//~ oRequest.setRequestHeader("User-Agent",navigator.userAgent);
oRequest.send();
var i18nDefault = eval('('+oRequest.responseText+')');
* */
var i18n = eval(locale);
var i18nDefault = en;

// Translating function
function _(s) {
	if (typeof(i18n)!='undefined' && i18n[s] && i18n[s]!='') {
		return i18n[s];
	}
	if (typeof(i18n)=='undefined' && typeof(i18nDefault)=='undefined') {
		return s;
	}
	return i18nDefault[s];
}

function translateDiv(divID) {
	var div = document.getElementById(divID);
	var elements = div.getElementsByClassName('i18n');
	for (i =0; i< elements.length; i++) {
		elements[i].innerHTML=_(elements[i].getAttribute('i18nText'));
	}
	return true
}
function fillData(divID) {
	var div = document.getElementById(divID);
	var elements = div.getElementsByClassName('data');
	for (i =0; i< elements.length; i++) {
		elements[i].innerHTML=data[elements[i].getAttribute('dataText')];
	}
	return true
}
// this get the browser install language, not the one set in preference
function get_locale() {
	var loc="en";
	if ( navigator ) {
		if ( navigator.language) {
			loc= navigator.language;
		}
		else if ( navigator.browserLanguage) {
			loc= navigator.browserLanguage;
		}
		else if ( navigator.systemLanguage) {
			loc= navigator.systemLanguage;
		}
		else if ( navigator.userLanguage) {
			loc= navigator.userLanguage;
		}
		else {loc = 'en';}
	}
	else {loc = 'en';}
	
	// use the locale only if string file is available!
	if (loc == 'en' | loc =='fr' | loc == 'de'){
		return loc;
	}
	else {return 'en';}
}

//set the language in a localstorage, then reload
function setlanguage(what){
	localStorage.l10n=what
	var linkto = document.getElementById('permalink').href;
	window.location.href = linkto;
}
// Show langage bar
function initFlags(){
	var max=4;
	var html='';
	html+= '<img style="margin-top: 5px; margin-left: 2px;" src="pics/flags/'+locale+'.png">';
	document.getElementById('langs').innerHTML = html;
}

function updateTooltips(){

	document.getElementById("settingsMenuButton").setAttribute('title',_('settings-tooltip'));
	document.getElementById("mapkeyMenuButton").setAttribute('title',_('MAP_KEY'));
	document.getElementById("editMenuButton").setAttribute('title',_('edit_the_map_using'));
	document.getElementById("aboutMenuButton").setAttribute('title',_('ABOUT'));
	document.getElementById("blogMenuButton").setAttribute('title',_('blog.opensnowmap.org'));
	document.getElementById("dataMenuButton").setAttribute('title',_('data-tooltip'));
	
	document.getElementById("langs").setAttribute('title',_('lang-tooltip'));
	document.getElementById("printMenuButton").setAttribute('title',_('print-tooltip'));
	document.getElementById("permalink.marker").setAttribute('title',_('marker-tooltip'));
	document.getElementById("permalink.simple").setAttribute('title',_('link-tooltip'));
	document.getElementById("desktopswitch").setAttribute('title',_('desktop-tooltip'));
	document.getElementById("mobileswitch").setAttribute('title',_('mobile-tooltip'));
	document.getElementById("listPistesMenuButton").setAttribute('title',_('list_pistes-tooltip'));
	
	document.getElementById("selectButton").setAttribute('title',_('interactive-tooltip'));
	document.getElementById("searchMenuButton").setAttribute('title',_('search-tooltip'));
}

