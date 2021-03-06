/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

  
/**
 * 볕뉘 수정사항:
 * var 에서 let/const 로 변수 변경
 * Worker 생성 관련 변경
 * ServerID 관련 변경
 * kkutu-lib 모듈에 호환되도록 수정
 */

const Cluster = require("cluster");
const Const = require('./const');
const lib = require('kkutu-lib');
const global = require('./global.json')
const JLog = lib.jjlog;
let SID = Number(process.argv[2] || 0);
let CPU = Number(process.argv[3] || global.CLUSTER_SLAVES || 4); //require("os").cpus().length;
const URL = require('url');

if(isNaN(SID)){
	if(process.argv[2] == "test"){
		global.test = true;
		SID = 0;
		CPU = 1;
	}else{
		console.log(`Invalid Server ID ${process.argv[2]}`);
		process.exit(1);
	}
}
if(isNaN(CPU)){
	console.log(`Invalid CPU Number ${process.argv[3]}`);
	process.exit(1);
}
if(Cluster.isMaster){
	let channels = {}, chan;
	let i;
	
	for(let i=0; i<CPU; i++){
		chan = i + 1;
		if(Array.isArray(Const.MAIN_PORTS[SID])) {
			channels[chan] = Cluster.fork({ SERVER_NO_FORK: true, KKUTU_PORT: Const.MAIN_PORTS[SID][1] + 416 + i, CHANNEL: chan });
		} else {
			let url = URL.parse(Const.MAIN_PORTS[SID]);
			channels[chan] = Cluster.fork({ SERVER_NO_FORK: true, KKUTU_PORT: parseInt(url.port) + 416 + i, CHANNEL: chan });
		}
	}
	Cluster.on('exit', function(w){
		for(let i in channels){
			if(channels[i] == w){
				chan = Number(i);
				break;
			}
		}
		JLog.error(`Worker @${chan} ${w.process.pid} died`);
		if(Array.isArray(Const.MAIN_PORTS[SID])) {
			channels[chan] = Cluster.fork({ SERVER_NO_FORK: true, KKUTU_PORT: Const.MAIN_PORTS[SID][1] + 416 + (chan - 1), CHANNEL: chan });
		} else {
			let url = URL.parse(Const.MAIN_PORTS[SID]);
			channels[chan] = Cluster.fork({ SERVER_NO_FORK: true, KKUTU_PORT: parseInt(url.port) + 416 + (chan - 1), CHANNEL: chan });
		}
	});
	if(Array.isArray(Const.MAIN_PORTS[SID])) {
		process.env['KKUTU_PORT'] = Const.MAIN_PORTS[SID][1]
	} else {
		let url = URL.parse(Const.MAIN_PORTS[SID]);
		process.env['KKUTU_PORT'] = parseInt(url.port);
	}
	require("./master.js").init(SID.toString(), channels);
}else{
	require("./slave.js");
}