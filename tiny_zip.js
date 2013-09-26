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
		var name = utf8array_from_str(nameStr.replace(/[\/\:*?"<>\\|]/, "").slice(0, 255));
		var nlen = name.length;
		var clen = content.length;
		var crc = crc32(content);
		var localH = new Uint8Array(30 + nlen);
		localH.set([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		crc, crc >> 8, crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24,
		clen, clen >> 8, clen >> 16, clen >> 24, nlen, nlen >> 8, 0x00, 0x00]);
		localH.set(name, 30);
		//
		var centralH = new Uint8Array(46 + nlen);
		var loff = local_offset;
		centralH.set([0x50, 0x4b, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		crc, crc >> 8, crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24,
		clen, clen >> 8, clen >> 16, clen >> 24, nlen, nlen >> 8,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, loff, loff >> 8, loff >> 16, loff >> 24]);
		centralH.set(name, 46);
		central_offset += centralH.length;
		//
		local_offset += localH.length + content.length;
		localHs.push(localH);
		contents.push(content);
		centralHs.push(centralH);
	};
	
	this.generate = function(type)
	{
		var n = localHs.length;
		//
		var endof = new Uint8Array(22);
		var loff = local_offset;
		var coff = central_offset;
		endof.set([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, n, n >> 8, n, n >> 8,
		coff, coff >> 8, coff >> 16, coff >> 24, loff, loff >> 8, loff >> 16, loff >> 24, 0x00, 0x00]);	
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
		if (type == "blob")
			return new Blob(outQueue, {type: "data:application/zip"});
		else if (type == "array")
		{
			var output = new Uint8Array(local_offset + central_offset + 22);
			for (var i = 0, k = 0; i < outQueue.length; k += outQueue[i].length, ++i)
				output.set(outQueue[i], k);
			return output;
		}
		else // type == "base64"
		{//disfunctional
			function out_it()
			{
				this.arr_i = 0;
				this.offset = 0;
				this.inc = function()
				{
					if (this.offset < outQueue[this.arr_i].length)
						++this.offset;
					else
					{
						++this.arr_i;
						this.offset = 0;
					}
				};
				this.deref = function()
				{
					return outQueue[this.arr_i][this.offset];
				};
			}
			//
			function sixbit_out_it()
			{
				it = new out_it();
				this.offset = 2;
				var prev_byte = 0;
				this.inc = function()
				{
					prev_byte = it.deref();
					if (this.offset == 6)
						this.offset = 0;
					else
					{
						it.inc();
						this.offset += 2;						
					}
				};
				this.deref = function()
				{
					return prev_byte <<< (8 - this.offset) | it.deref() >>> this.offset & 0xFFFFFF;
				};
			}
			//
			outQueue.push([0]);
			var output = [];
			var b64Table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+\\";
			it = new sixbit_out_it();
			for (it.it.arr_i < outQueue.length; it.inc())
				output += b64Table.charAt(it.deref);
			switch(it.offset)
			{
			case 2:
				output += "==";
				break;
			case 4:
				output += "=";
				break;
			case 2:
				output = output.slice(0, -1);
			}
			return output;
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
			crc = (crc >>> 8) ^ crcTable[crc ^ data[i] & 0xFF];
		return ~crc;
	};
}
