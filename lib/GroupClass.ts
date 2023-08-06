import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { Point } from "./PointClass";
import p5Types from "p5";
import { Handpose } from "../@types/global";
import { Node } from "./NodeClass";

export class Group extends Node {
  rotation: number;
  children: Group[] | Point[];
  origin: Keypoint;
  state: "add" | "delete" | "none";
  targetId: number;
  originRule: (children: Group[] | Point[]) => Keypoint;

  constructor(children: Group[] | Point[]) {
    super({ x: 0, y: 0 });
    this.rotation = 0;
    this.children = children;
    this.origin = { x: 0, y: 0 };
    this.state = "none";
    this.targetId = 0;
    this.originRule = (children: Group[] | Point[]) => {
      return { x: 0, y: 0 };
    };
  }

  updateGroupPosition(handpose: Handpose, index: number) {
    this.updatePosition(handpose, index);
    this.children.forEach((child: Group | Point, id) => {
      if ("updateGroupPosition" in child) {
        //Groupの場合
        child.updateGroupPosition(handpose, id);
      } else {
        //Pointの場合
        if (this.targetId == 0 && child.id == 0) {
          //0のとき、child.id == 0となるが、もともと手首の位置にあたる0は、fingerの定義の段階で特殊なことをしているので、ここだけ例外処理が必要。
          //id周りはその場しのぎで使われていてルールが統一されていない。引数でindexを渡すことを廃し、this.idなどで処理できるようにすることが理想的？
          child.updatePosition(handpose, index);
        } else {
          child.updatePosition(handpose, (child as Point).id);
        }
      }
      // this.updateOrigin(this.children);
    });
    if (
      this.state == "delete" &&
      this.children[this.targetId].getTransitionProgress() >= 1
    ) {
      this.children.splice(this.targetId, 1);
      this.state = "none";
    }
  }

  updateOrigin(children: Group[] | Point[]) {
    this.origin = this.originRule(children);
  }

  show(p5: p5Types) {
    p5.push();
    const currentPosition = this.getPosition();
    p5.translate(currentPosition.x, currentPosition.y);
    p5.translate(-this.origin.x, -this.origin.y);
    p5.rotate(this.rotation);

    this.children.forEach((child: Group | Point, index) => {
      if ("show" in child) {
        //Groupの場合
        child.show(p5);
      } else {
        //Pointの場合
        p5.strokeWeight(2);
        const cPos = child.getPosition();
        p5.circle(cPos.x, cPos.y, 10);
        if (index < this.children.length - 1) {
          const nPos = this.children[index + 1].getPosition();
          p5.line(cPos.x, cPos.y, nPos.x, nPos.y);
        }
      }
    });
    p5.pop();
  }

  delete(
    id: number,
    terminateRule: (handpose: Handpose, index: number) => Keypoint
  ) {
    this.targetId = id;
    this.state = "delete";
    (this.children[id] as Point).updatePositionRule(terminateRule);
  }

  add(
    id: number,
    pointId: number,
    beginRule: (handpose: Handpose, index: number) => Keypoint,
    terminateRule: (handpose: Handpose, index: number) => Keypoint
  ) {
    const point = new Point({ x: 0, y: 0 }, pointId);
    point.setPositionRule(beginRule);
    point.updatePositionRule(terminateRule);
    (this.children as Point[]).splice(id, 0, point);
  }
}
