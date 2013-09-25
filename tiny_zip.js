function tiny_zip()
{
    var localHs = [];
    var contents = [];
    var local_offset = 0;
    var centralHs = [];
    var central_offset = 0;
	this.add = function(name, content)
	{
		var nlen = name.length;
		var clen = content.length;
		var crc = crc32(content);
		var localH = new Uint8Array(30 + nlen);
		localH.set([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		crc, crc >> 8, crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24,
		clen, clen >> 8, clen >> 16, clen >> 24, nlen, nlen >> 8, 0x00, 0x00]);
		for (var i = 0; i < nlen; ++i)
			localH.set([name.charCodeAt(i)], 30 + i);
		//...content...
		var centralH = new Uint8Array(46 + nlen);
		var loff = local_offset;
		centralH.set([0x50, 0x4b, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		crc, crc >> 8, crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24,
		clen, clen >> 8, clen >> 16, clen >> 24, nlen, nlen >> 8,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, loff, loff >> 8, loff >> 16, loff >> 24]);
		for (var i = 0; i < nlen; ++i)
			centralH.set([name.charCodeAt(i)], 46 + i);
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
		endof.set([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, n, n >> 8, n, n >> 8,
		coff, coff >> 8, coff >> 16, coff >> 24, loff, loff >> 8, loff >> 16, loff >> 24, 0x00, 0x00]);	
		//
		var output = new Uint8Array(local_offset + central_offset + 22);
		var k = 0;
		for (var i = 0; i < n; ++i)
		{
			output.set(localHs[i], k); k += localHs[i].length;
			output.set(contents[i], k); k += contents[i].length;
		}
		for (var i = 0; i < n; ++i)
		{
			output.set(centralHs[i], k);
			k += centralHs[i].length;
		}
		output.set(endof, k);
		return output;
	};
	
	var crcTable = function()
	{
		var Table = [];
		for (var i = 0; i < 256; ++i)
        {
            var crc = i;
            for (var j = 0; j < 8; ++j)
                crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
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

function binary_from_string(string)
{
	var binary = new Uint8Array(string.length);
	for (var i = 0; i < string.length; ++i)
			centralH.set([string.charCodeAt(i)], i);
}
