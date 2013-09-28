function uint8array_from_binstr(string)
{
	var binary = new Uint8Array(string.length);
	for (var i = 0; i < string.length; ++i)
		binary.set([string.charCodeAt(i)], i);
	return binary;
}

function tiny_zip()
{
	var localHs = [];
	var contents = [];
	var local_offset = 0;
	var centralHs = [];
	var central_offset = 0;
	this.add = function(nameStr, content)
	{
		var utf8array_from_str = function(string)
		{
			return uint8array_from_binstr(unescape(encodeURIComponent(string)));
		};
		var name = utf8array_from_str(nameStr.replace(/[\/\:*?"<>\\|]/g, "_").slice(0, 255));
		var nlen = name.length;
		var clen = content.length;
		var crc = crc32(content);
		var localH = new Uint8Array(30 + nlen);
		localH.set([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,	crc, crc >> 8,
			crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24, clen, clen >> 8, clen >> 16, clen >> 24,
			nlen, nlen >> 8, 0x00, 0x00]);
		localH.set(name, 30);
		//
		var centralH = new Uint8Array(46 + nlen);
		var loff = local_offset;
		centralH.set([0x50, 0x4b, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			crc, crc >> 8, crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24, clen, clen >> 8, clen >> 16,
			clen >> 24, nlen, nlen >> 8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, loff,
			loff >> 8, loff >> 16, loff >> 24]);
		centralH.set(name, 46);
		central_offset += centralH.length;
		//
		local_offset += localH.length + content.length;
		localHs.push(localH);
		contents.push(content);
		centralHs.push(centralH);
	};
	
	this.generate = function()
	{
		var n = localHs.length;
		//
		var endof = new Uint8Array(22);
		var loff = local_offset;
		var coff = central_offset;
		endof.set([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, n, n >> 8, n, n >> 8, coff, coff >> 8, coff >> 16,
			coff >> 24, loff, loff >> 8, loff >> 16, loff >> 24, 0x00, 0x00]);	
		//
		var outQueue = [];
		for (var i = 0; i < n; ++i)
		{
			outQueue.push(localHs[i]);
			outQueue.push(contents[i]);
		}
		for (var i = 0; i < n; ++i)
			outQueue.push(centralHs[i]);
		outQueue.push(endof);
		//
		return new Blob(outQueue, {type: "data:application/zip"});
	};
	
	var crcTable = function()
	{
		var Table = [];
		for (var i = 0; i < 256; ++i)
		{
			var crc = i;
			for (var j = 0; j < 8; ++j)
				crc = -(crc & 1) & 0xEDB88320 ^ (crc >>> 1) ;
			Table[i] = crc;
        	}
		return Table;
	} ();
	var crc32 = function(data)
	{
		var crc = -1;
		for (var i = 0; i < data.length; ++i)
			crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
		return ~crc;
	};
}
