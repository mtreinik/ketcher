var Box2Abs = require('../util/box2abs');
var Vec2 = require('../util/vec2');
var util = require('../util');

var SGroup = require('../chem/sgroup');

var Visel = require('./visel');

var ReObject = require('./reobject')

var ReRGroup = function (/*Struct.RGroup*/rgroup) {
	this.init(Visel.TYPE.RGROUP);

	this.labelBox = null;
	this.item = rgroup;
};
ReRGroup.prototype = new ReObject();
ReRGroup.isSelectable = function () { return false; }

ReRGroup.prototype.getAtoms = function (render) {
	var ret = [];
	this.item.frags.each(function (fnum, fid) {
		ret = ret.concat(render.ctab.frags.get(fid).fragGetAtoms(render, fid));
	});
	return ret;
};

ReRGroup.prototype.getBonds = function (render) {
	var ret = [];
	this.item.frags.each(function (fnum, fid) {
		ret = ret.concat(render.ctab.frags.get(fid).fragGetBonds(render, fid));
	});
	return ret;
};

ReRGroup.findClosest = function (render, p, skip, minDist) {
	minDist = Math.min(minDist || render.opt.selectionDistanceCoefficient, render.opt.selectionDistanceCoefficient);
	var ret;
	render.ctab.rgroups.each(function (rgid, rgroup) {
		if (rgid != skip) {
			if (rgroup.labelBox) { // should be true at this stage, as the label is visible
				if (rgroup.labelBox.contains(p, 0.5)) { // inside the box or within 0.5 units from the edge
					var dist = Vec2.dist(rgroup.labelBox.centre(), p);
					if (!ret || dist < minDist) {
						minDist = dist;
						ret = { 'id': rgid, 'dist': minDist };
					}
				}
			}
		}
	});
	return ret;
};

ReRGroup.prototype.calcBBox = function (render) {
	var ret;
	this.item.frags.each(function (fnum, fid) {
		var bbf = render.ctab.frags.get(fid).calcBBox(render, fid);
		if (bbf) {
			ret = (ret ? Box2Abs.union(ret, bbf) : bbf);
		}
	});
	ret = ret.extend(this.__ext, this.__ext);
	return ret;
};

ReRGroup.drawBrackets = function (set, render, bb, d, n) {
	d = d || new Vec2(1, 0);
	var bracketWidth = Math.min(0.25, bb.sz().x * 0.3);
	var height = bb.p1.y - bb.p0.y;
	var cy = 0.5 * (bb.p1.y + bb.p0.y);
	var leftBracket = SGroup.drawBracket(render, render.paper, render.styles, d.negated(), d.negated().rotateSC(1, 0), new Vec2(bb.p0.x, cy), bracketWidth, height);
	var rightBracket = SGroup.drawBracket(render, render.paper, render.styles, d, d.rotateSC(1, 0), new Vec2(bb.p1.x, cy), bracketWidth, height);
	set.push(leftBracket, rightBracket);
};

ReRGroup.prototype.draw = function (render) { // TODO need to review parameter list
	var bb = this.calcBBox(render);
	var settings = render.settings;
	if (bb) {
		var ret = { 'data': [] };
		var p0 = render.obj2scaled(bb.p0);
		var p1 = render.obj2scaled(bb.p1);
		var brackets = render.paper.set();
		ReRGroup.drawBrackets(brackets, render, bb);
		ret.data.push(brackets);
		var key = render.ctab.rgroups.keyOf(this);
		var labelSet = render.paper.set();
		var label = render.paper.text(p0.x, (p0.y + p1.y) / 2, 'R' + key + '=')
		.attr({
			'font': settings.font,
			'font-size': settings.fontRLabel,
			'fill': 'black'
		});
		var labelBox = util.relBox(label.getBBox());
		label.translateAbs(-labelBox.width / 2 - settings.lineWidth, 0);
		labelSet.push(label);
		var logicStyle = {
			'font': settings.font,
			'font-size': settings.fontRLogic,
			'fill': 'black'
		};

		var logic = [];
		// TODO [RB] temporary solution, need to review
		//BEGIN
		/*
         if (this.item.range.length > 0)
         logic.push(this.item.range);
         if (this.item.resth)
         logic.push("RestH");
         if (this.item.ifthen > 0)
         logic.push("IF R" + key.toString() + " THEN R" + this.item.ifthen.toString());
         */
		logic.push(
			(this.item.ifthen > 0 ? 'IF ' : '')
			 + 'R' + key.toString()
			 + (this.item.range.length > 0
			 ? this.item.range.startsWith('>') || this.item.range.startsWith('<') || this.item.range.startsWith('=')
				 ? this.item.range
				 : '=' + this.item.range
			 : '>0')
			 + (this.item.resth ? ' (RestH)' : '')
			 + (this.item.ifthen > 0 ? '\nTHEN R' + this.item.ifthen.toString() : '')
		);
		//END
		var shift = labelBox.height / 2 + settings.lineWidth / 2;
		for (var i = 0; i < logic.length; ++i) {
			var logicPath = render.paper.text(p0.x, (p0.y + p1.y) / 2, logic[i]).attr(logicStyle);
			var logicBox = util.relBox(logicPath.getBBox());
			shift += logicBox.height / 2;
			logicPath.translateAbs(-logicBox.width / 2 - 6 * settings.lineWidth, shift);
			shift += logicBox.height / 2 + settings.lineWidth / 2;
			ret.data.push(logicPath);
			labelSet.push(logicPath);
		}
		ret.data.push(label);
		this.labelBox = Box2Abs.fromRelBox(labelSet.getBBox()).transform(render.scaled2obj, render);
		return ret;
	} else {
		// TODO abnormal situation, empty fragments must be destroyed by tools
		return {};
	}
};

ReRGroup.prototype._draw = function (render, rgid, attrs) { // TODO need to review parameter list
	var bb = this.getVBoxObj(render).extend(this.__ext, this.__ext);
	if (bb) {
		var p0 = render.obj2scaled(bb.p0);
		var p1 = render.obj2scaled(bb.p1);
		return render.paper.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y, 0).attr(attrs);
	}
};

ReRGroup.prototype.drawHighlight = function (render) {
	var rgid = render.ctab.rgroups.keyOf(this);
	if (!Object.isUndefined(rgid)) {
		var ret = this._draw(render, rgid, render.styles.highlightStyle/*{ 'fill' : 'red' }*/);
		render.ctab.addReObjectPath('highlighting', this.visel, ret);
		/*
         this.getAtoms(render).each(function(aid) {
         render.ctab.atoms.get(aid).drawHighlight(render);
         }, this);
         */
		this.item.frags.each(function (fnum, fid) {
			render.ctab.frags.get(fid).drawHighlight(render);
		}, this);
		return ret;
	} else {
		// TODO abnormal situation, fragment does not belong to the render
	}
};
module.exports = ReRGroup