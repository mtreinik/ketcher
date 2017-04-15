var Vec2 = require('../util/vec2');

var SELECTION_DISTANCE_COEFFICIENT = 0.4;

function findClosestAtom(restruct, pos, skip, minDist) {
	var closestAtom = null;
	var maxMinDist = SELECTION_DISTANCE_COEFFICIENT;
	var skipId = skip && skip.map == 'atoms' ? skip.id : null;
	minDist = minDist || maxMinDist;
	minDist = Math.min(minDist, maxMinDist);
	restruct.atoms.each(function (aid, atom) {
		if (aid !== skipId) {
			var dist = Vec2.dist(pos, atom.a.pp);
			if (dist < minDist) {
				closestAtom = aid;
				minDist = dist;
			}
		}
	});
	if (closestAtom != null) {
		return {
			id: closestAtom,
			dist: minDist
		};
	}
	return null;
}

function findClosestBond(restruct, pos, skip, minDist) {
	var closestBond = null;
	var closestBondCenter = null;
	var maxMinDist = SELECTION_DISTANCE_COEFFICIENT;
	minDist = minDist || maxMinDist;
	minDist = Math.min(minDist, maxMinDist);
	var minCDist = minDist;
	restruct.bonds.each(function (bid, bond) {
		var p1 = restruct.atoms.get(bond.b.begin).a.pp,
			p2 = restruct.atoms.get(bond.b.end).a.pp;
		var mid = Vec2.lc2(p1, 0.5, p2, 0.5);
		var cdist = Vec2.dist(pos, mid);
		if (cdist < minCDist) {
			minCDist = cdist;
			closestBondCenter = bid;
		}
	});
	restruct.bonds.each(function (bid, bond) {
		var hb = restruct.molecule.halfBonds.get(bond.b.hb1);
		var d = hb.dir;
		var n = hb.norm;
		var p1 = restruct.atoms.get(bond.b.begin).a.pp,
			p2 = restruct.atoms.get(bond.b.end).a.pp;

		var inStripe = Vec2.dot(pos.sub(p1), d) * Vec2.dot(pos.sub(p2), d) < 0;
		if (inStripe) {
			var dist = Math.abs(Vec2.dot(pos.sub(p1), n));
			if (dist < minDist) {
				closestBond = bid;
				minDist = dist;
			}
		}
	});
	if (closestBond !== null || closestBondCenter !== null) {
		return {
			id: closestBond,
			dist: minDist,
			cid: closestBondCenter,
			cdist: minCDist
		};
	}
	return null;
}

function findClosestChiralFlag(restruct, pos) {
	var minDist;
	var ret;

	// there is only one chiral flag, but we treat it as a "map" for convenience
	restruct.chiralFlags.each(function (id, item) {
		var p = item.pp;
		if (Math.abs(pos.x - p.x) < 1.0) {
			var dist = Math.abs(pos.y - p.y);
			if (dist < 0.3 && (!ret || dist < minDist)) {
				minDist = dist;
				ret = { id: id, dist: minDist };
			}
		}
	});
	return ret;
}

function findClosestDataSGroupData(restruct, pos) {
	var minDist = null;
	var ret = null;

	restruct.sgroupData.each(function (id, item) {
		if (item.sgroup.type != 'DAT')
			throw new Error('Data group expected');
		if (item.sgroup.data.fieldName != "MRV_IMPLICIT_H") {
			var box = item.sgroup.dataArea;
			var inBox = box.p0.y < pos.y && box.p1.y > pos.y && box.p0.x < pos.x && box.p1.x > pos.x;
			var xDist = Math.min(Math.abs(box.p0.x - pos.x), Math.abs(box.p1.x - pos.x));
			if (inBox && (ret == null || xDist < minDist)) {
				ret = { id: id, dist: xDist };
				minDist = xDist;
			}
		}
	});
	return ret;
}

function findClosestFrag(restruct, pos, skip, minDist) {
	minDist = Math.min(minDist || SELECTION_DISTANCE_COEFFICIENT,
	                   SELECTION_DISTANCE_COEFFICIENT);
	var ret;
	var skipId = skip && skip.map == 'frags' ? skip.id : null;
	restruct.frags.each(function (fid, frag) {
		if (fid != skipId) {
			var bb = frag.calcBBox(restruct, fid); // TODO any faster way to obtain bb?
			if (bb.p0.y < pos.y && bb.p1.y > pos.y && bb.p0.x < pos.x && bb.p1.x > pos.x) {
				var xDist = Math.min(Math.abs(bb.p0.x - pos.x), Math.abs(bb.p1.x - pos.x));
				if (!ret || xDist < minDist) {
					minDist = xDist;
					ret = { id: fid, dist: minDist };
				}
			}
		}
	});
	return ret;
}

function findClosestRGroup(restruct, pos, skip, minDist) {
	minDist = Math.min(minDist || SELECTION_DISTANCE_COEFFICIENT,
	                   SELECTION_DISTANCE_COEFFICIENT);
	var ret;
	restruct.rgroups.each(function (rgid, rgroup) {
		if (rgid != skip) {
			if (rgroup.labelBox) { // should be true at this stage, as the label is visible
				if (rgroup.labelBox.contains(pos, 0.5)) { // inside the box or within 0.5 units from the edge
					var dist = Vec2.dist(rgroup.labelBox.centre(), pos);
					if (!ret || dist < minDist) {
						minDist = dist;
						ret = { id: rgid, dist: minDist };
					}
				}
			}
		}
	});
	return ret;
}

function findClosestRxnArrow(restruct, pos) {
	var minDist;
	var ret;

	restruct.rxnArrows.each(function (id, arrow) {
		var p = arrow.item.pp;
		if (Math.abs(pos.x - p.x) < 1.0) {
			var dist = Math.abs(pos.y - p.y);
			if (dist < 0.3 && (!ret || dist < minDist)) {
				minDist = dist;
				ret = { id: id, dist: minDist };
			}
		}
	});
	return ret;
}

function findClosestRxnPlus(restruct, pos) {
	var minDist;
	var ret;

	restruct.rxnPluses.each(function (id, plus) {
		var p = plus.item.pp;
		var dist = Math.max(Math.abs(pos.x - p.x), Math.abs(pos.y - p.y));
		if (dist < 0.5 && (!ret || dist < minDist)) {
			minDist = dist;
			ret = { id: id, dist: minDist };
		}
	});
	return ret;
}

function findClosestSGroup(restruct, pos) {
	var ret = null;
	var minDist = SELECTION_DISTANCE_COEFFICIENT;
	restruct.molecule.sgroups.each(function (sgid, sg) {
		var d = sg.bracketDir,
			n = d.rotateSC(1, 0);
		var pg = new Vec2(Vec2.dot(pos, d), Vec2.dot(pos, n));
		for (var i = 0; i < sg.areas.length; ++i) {
			var box = sg.areas[i];
			var inBox = box.p0.y < pg.y && box.p1.y > pg.y && box.p0.x < pg.x && box.p1.x > pg.x;
			var xDist = Math.min(Math.abs(box.p0.x - pg.x), Math.abs(box.p1.x - pg.x));
			if (inBox && (ret == null || xDist < minDist)) {
				ret = sgid;
				minDist = xDist;
			}
		}
	});
	if (ret != null) {
		return {
			id: ret,
			dist: minDist
		};
	}
	return null;
}

var findMaps = {
	atoms: findClosestAtom,
	bonds: function (restruct, pos) {
		var options = global._ui_editor.render.options;
		var bond = findClosestBond(restruct, pos);
		var res = null;
		if (bond) {
			if (bond.cid !== null)
				res = { id: bond.cid, dist: bond.cdist };
			if (res == null || res.dist > 0.4 * options.scale) // hack (ported from old code)
				res = bond;
		}
		return res;
	},
	chiralFlags: findClosestChiralFlag,
	sgroupData: findClosestDataSGroupData,
	sgroups: findClosestSGroup,
	rxnArrows: findClosestRxnArrow,
	rxnPluses: findClosestRxnPlus,
	frags: findClosestFrag,
	rgroups: findClosestRGroup
};

function findClosestItem(restruct, pos, maps, skip) {
	maps = maps || Object.keys(findMaps);
	return maps.reduce(function (res, mp) {
		var item = findMaps[mp](restruct, pos, skip);
		if (item != null && (res == null || res.dist > item.dist)) {
			return {
				map: mp,
				id: item.id,
				dist: item.dist
			};
		}
		return res;
	}, null);
}

module.exports = {
	atom: findClosestAtom, // used in Actions
	item: findClosestItem
};
