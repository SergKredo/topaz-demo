//SigWebTablet JavaScript File for SigWeb
//
//Version - 1.0.4.0
//
//Last updated by Topaz Systems Inc. - 1/5/2021
//

var getBlobURL = (window.URL && URL.createObjectURL.bind(URL)) || (window.webkitURL && webkitURL.createObjectURL.bind(webkitURL)) || window.createObjectURL;
var revokeBlobURL = (window.URL && URL.revokeObjectURL.bind(URL)) || (window.webkitURL && webkitURL.revokeObjectURL.bind(webkitURL)) || window.revokeObjectURL;

var baseUri = makeUri();
var	ctx;

function IsSigWebInstalled(){
	var xhr = new XMLHttpRequest();
	try{
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 0) {
				console.log("Unknown Error Occured. SigWeb Service response not received.");
				return false;
			}
		};
		xhr.open("GET", baseUri+"TabletState"+"?noCache="+generateUUID(), false);
		xhr.send();
	}catch(e){
		console.log('catch', e);
	}

	return (xhr.status != 404 && xhr.status != 0);
}

function isIE() {

	return ((navigator.appName == 'Microsoft Internet Explorer') || ((navigator.appName == 'Netscape') && (new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})").exec
	(navigator.userAgent) != null)));
}

function isChrome() {
	var ua = navigator.userAgent;
	var chrome = false;

	//Javascript Browser Detection - Chrome
	if (ua.lastIndexOf('Chrome/') > 0) {
		//var version = ua.substr(ua.lastIndexOf('Chrome/') + 7, 2);
		return true;
	}
	else {
		return false;
	}
}

function makeUri() {
	var prot = location.protocol;
	if(prot == "file:")
	{
		prot = 'http:';
	}

	if (isIE()) {
		if (prot == 'https:') {
			return (prot + "//tablet.sigwebtablet.com:47290/SigWeb/");
		}
		else {
			return (prot + "//tablet.sigwebtablet.com:47289/SigWeb/");
		}
	}

	if (isChrome()) {
		if (prot == 'https:') {
			return (prot + "//tablet.sigwebtablet.com:47290/SigWeb/");
		}
		else {
			return (prot + "//tablet.sigwebtablet.com:47289/SigWeb/");
		}
	}

	else {
		//FIREFOX
		if (prot == 'https:') {
			return (prot + "//tablet.sigwebtablet.com:47290/SigWeb/");
		}
		else {
			return (prot + "//tablet.sigwebtablet.com:47289/SigWeb/");
		}
	}
}

function SigWebcreateXHR() {
	try { return new XMLHttpRequest(); } catch (e) { }
	try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e) { }
	try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e) { }
	try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) { }
	try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch (e) { }

	alert("XMLHttpRequest not supported");
	return null;
}

var Count = false;



function SigWebSetProperty(prop) {
	var xhr = SigWebcreateXHR();

	if (xhr) {
		xhr.open("POST", baseUri + prop, true);
		xhr.send(null);
		if (xhr.readyState == 4 && xhr.status == 200) {
			return xhr.responseText;
		}
	}
	return "";
}

function SigWebSetPropertySync(prop) {
	var xhr = SigWebcreateXHR();

	if (xhr) {
		xhr.open("POST", baseUri + prop, false);
		xhr.send();
		if (xhr.readyState == 4 && xhr.status == 200) {
			return xhr.responseText;
		}
	}
	return "";
}

function SigWebSetStreamProperty(prop, strm) {
	var xhr = SigWebcreateXHR();

	if (xhr) {
		xhr.open("POST", baseUri + prop );
		xhr.setRequestHeader("Content-Type", "text/plain");
		xhr.send(strm);
		//			if (xhr.readyState == 4 && xhr.status == 200) {
		//				return xhr.responseText;
		//			}
	}
	return "";
}

function SigWebSyncSetStreamProperty(prop, strm) {
	var xhr = SigWebcreateXHR();

	if (xhr) {
		xhr.open("POST", baseUri + prop , false);
		xhr.setRequestHeader("Content-Type", "text/plain");
		xhr.send(strm);
		if (xhr.readyState == 4 && xhr.status == 200) {
			return xhr.responseText;
		}
	}
	return "";
}

function SigWebSetImageStreamProperty(prop, strm) {
	var xhr = SigWebcreateXHR();

	if (xhr) {
		xhr.open("POST", baseUri + prop, false);
		xhr.setRequestHeader("Content-Type", "image/png");
		xhr.send(strm);
		if (xhr.readyState == 4 && xhr.status == 200) {
			return xhr.responseText;
		}
	}
	return "";
}

function SigWebSetImageBlobProperty(prop, strm) {
	var xhr = SigWebcreateXHR();

	//			var bb = new BlobBuilder();
	//			bb.append( strm );
	//			bb.append( "\0" );
	//			var blob = bb.getBlob( );

	if (xhr) {
		xhr.open("POST", baseUri + prop, false);
		xhr.setRequestHeader("Content-Type", "blob");
		xhr.send(strm);
		if (xhr.readyState == 4 && xhr.status == 200) {
			return xhr.responseText;
		}
	}
	return "";
}

function SigWebGetProperty(prop) {
	var xhr = SigWebcreateXHR();

	if (xhr) {
		xhr.open("GET", baseUri + prop + "?noCache=" + generateUUID(), false );
		xhr.send(null);
		if (xhr.readyState == 4 && xhr.status == 200) {
			return xhr.responseText;
		}
	}
	return "";
}



var SigImageB64;

function GetSigImageB64(callback )
{
	var cvs = document.createElement('canvas');
	cvs.width = GetImageXSize();
	cvs.height = GetImageYSize();

	var xhr2 = new XMLHttpRequest();
	xhr2.open("GET", baseUri + "SigImage/1"  + "?noCache=" + generateUUID(), true);
	xhr2.responseType = "blob";
	xhr2.send(null);
	xhr2.onload = function ()
	{
		var cntx = cvs.getContext('2d');
		var img = new Image();
		img.src = getBlobURL(xhr2.response);
		img.onload = function ()
		{
			cntx.drawImage(img, 0, 0);
			var b64String = cvs.toDataURL("image/png");
			var loc = b64String.search("base64,");
			var retstring = b64String.slice(loc + 7, b64String.length);
			if (callback)
			{
				callback(retstring);
			}
		}
	}
}

function generateUUID() {
	var d = new Date().getTime();
	if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
		d += performance.now(); //use high-precision timer if available
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

function GetVersionString() {
	var Prop = "Version";

	Prop = Prop;
	var Str = SigWebGetProperty(Prop);
	var trimStr = Str.slice(1, Str.length - 2);
	return trimStr;
}

function ClearTablet() {
	var Prop = "ClearSignature";

	Prop = Prop;
	return SigWebGetProperty(Prop);
}

function TabletConnectQuery() {
	var Prop = "TabletConnectQuery";

	Prop = Prop;
	return SigWebGetProperty(Prop);
}

function OpenTablet(v) {
	var Prop = "OpenTablet/";

	Prop = Prop + v;
	SigWebSetPropertySync(Prop);
}

function SetRealTabletState(v) {
	var Prop = "TabletState/";

	Prop = Prop + v;
	SigWebSetPropertySync(Prop);
}

function GetTabletState() {
	var Prop = "TabletState";

	Prop = Prop;
	return SigWebGetProperty(Prop);
}

function SetTabletState(v, ctx, tv)
{
	var delay;

	if (tv)
	{
		delay = tv;
	}
	else
	{
		delay = 100;
	}

	if (GetTabletState() != v)
	{
		if (v == 1)
		{
			SetRealTabletState(v);
			return null;
		}
		else
		{
			SetRealTabletState(v);
		}
	}
	return null;
}
