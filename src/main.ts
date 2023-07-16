import {
  Document,
  NodeIO,
  Accessor,
} from "@gltf-transform/core"
import { mat4, vec3, quat } from "gl-matrix"

function main() {
  const doc = new Document()
  const buffer = doc.createBuffer("dataBuffer")

  const verts = [] as [number, number, number][]
  const triangles = [] as [number, number, number][]

  // The center
  verts.push([0, 0, 0])
  const divisions = 6
  for (let i = 0; i < divisions; i++) {
    const theta = 2 * Math.PI / divisions * i
    verts.push([Math.cos(theta), Math.sin(theta), 0])
    triangles.push([0, i + 1, (i + 1) % divisions + 1])
  }

  const vertsAccessor = doc.createAccessor("vertsAccessor")
    .setArray(new Float32Array(verts.flat()))
    .setType(Accessor.Type.VEC3)
    .setBuffer(buffer)

  const indicesAccessor = doc.createAccessor("indicesAccessor")
    .setArray(new Uint32Array(triangles.flat()))
    .setType(Accessor.Type.SCALAR)
    .setBuffer(buffer)

  const skin = doc.createSkin("skin")
  const jointPositions = [vec3.fromValues(0.5, 0, 0), vec3.fromValues(0.5, 0, 0)]
  const joints = jointPositions.map((pos, i) => {
    return doc.createNode(`joint${i}`)
      .setTranslation([pos[0], pos[1], pos[2]])
      .setScale([1, 1, 1])
      .setRotation([0, 0, 0, 1])
  })
  joints.forEach((joint, i) => {
    skin.addJoint(joint)
    if (i > 0) {
      joints[i - 1].addChild(joint)
    }
  })
  skin.setSkeleton(joints[0])

  const jointAssignments = [] as [number, number, number, number][]
  const weights = [] as [number, number, number, number][]

  jointAssignments.push([0, 0, 0, 0])
  jointAssignments.push([0, 1, 0, 0])
  jointAssignments.push([0, 0, 0, 0])
  jointAssignments.push([0, 0, 0, 0])
  jointAssignments.push([0, 0, 0, 0])
  jointAssignments.push([0, 0, 0, 0])
  jointAssignments.push([0, 0, 0, 0])

  weights.push([1, 0, 0, 0])
  weights.push([0, 1, 0, 0])
  weights.push([1, 0, 0, 0])
  weights.push([1, 0, 0, 0])
  weights.push([1, 0, 0, 0])
  weights.push([1, 0, 0, 0])
  weights.push([1, 0, 0, 0])

  const jointsAccessor = doc
    .createAccessor("jointAssignments")
    // Joint assignments must be stored as unsigned bytes or unsingned shorts, Uint8Array or Uint16Array.
    .setArray(new Uint8Array(jointAssignments.flat()))
    .setType(Accessor.Type.VEC4)
    .setBuffer(buffer)

  const weightsAccessor = doc
    .createAccessor("weights")
    .setArray(new Float32Array(weights.flat()))
    .setType(Accessor.Type.VEC4)
    .setBuffer(buffer)

  const primitive = doc.createPrimitive()
    .setAttribute("POSITION", vertsAccessor)
    .setIndices(indicesAccessor)
    .setAttribute("JOINTS_0", jointsAccessor)
    .setAttribute("WEIGHTS_0", weightsAccessor)
  const mesh = doc.createMesh("mesh").addPrimitive(primitive)
  const polygon = doc.createNode("polygon").setMesh(mesh)
  polygon.setSkin(skin)

  const jointCenterMatrix = mat4.fromTranslation(mat4.create(), jointPositions[0])
  mat4.invert(jointCenterMatrix, jointCenterMatrix)
  const joint0Matrix = mat4.fromTranslation(mat4.create(), vec3.add(vec3.create(), jointPositions[0], jointPositions[1]))
  mat4.invert(joint0Matrix, joint0Matrix)
  const inverseBindMatrices = [] as number[]
 
  const jointMatrices = [jointCenterMatrix, joint0Matrix]
  for (let i = 0; i < jointMatrices.length; i++) {
    const jointMatrix = jointMatrices[i]
    for (let j = 0; j < 16; j++) {
      inverseBindMatrices.push(jointMatrix[j])
    }
  }

  const inverseBindMatricesAccessor = doc
    .createAccessor("inverseBindMatrices")
    .setArray(new Float32Array(inverseBindMatrices))
    .setType(Accessor.Type.MAT4)
    .setBuffer(buffer)

  skin.setInverseBindMatrices(inverseBindMatricesAccessor)

  const times = doc.createAccessor("times")
    .setArray(new Float32Array([0, 1, 2, 3, 4]))
    .setType(Accessor.Type.SCALAR)
    .setBuffer(buffer)

  const positionAccessor = doc.createAccessor("positions")
    .setArray(new Float32Array([
      vec3.add(vec3.create(), jointPositions[1], vec3.fromValues(0, 0, 0)),
      vec3.add(vec3.create(), jointPositions[1], vec3.fromValues(0, 0, -1)),
      vec3.add(vec3.create(), jointPositions[1], vec3.fromValues(0, 0, 0)),
      vec3.add(vec3.create(), jointPositions[1], vec3.fromValues(0, 0, 1)),
      vec3.add(vec3.create(), jointPositions[1], vec3.fromValues(0, 0, 0)),
    ].map(p => [p[0], p[1], p[2]]).flat()))
    .setType(Accessor.Type.VEC3)
    .setBuffer(buffer)

  const rotations = [] as mat4[]
  rotations.push(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 0, 0)))
  rotations.push(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 0, -90)))
  rotations.push(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 0, 0)))
  rotations.push(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 0, 90)))
  rotations.push(mat4.fromQuat(mat4.create(), quat.fromEuler(quat.create(), 0, 0, 0)))

  const rotationAccessor = doc
    .createAccessor("rotations")
    .setArray(new Float32Array(rotations.map(m => [m[0], m[1], m[2], m[3]]).flat()))
    .setType(Accessor.Type.VEC4)
    .setBuffer(buffer)

  const positionSampler = doc.createAnimationSampler("positionSampler")
    .setInput(times)
    .setOutput(positionAccessor)
    .setInterpolation("LINEAR")

  const positionChannel = doc.createAnimationChannel("positionChannel")
    .setTargetNode(joints[1])
    .setTargetPath("translation")
    .setSampler(positionSampler)

  const rotationSampler = doc.createAnimationSampler("rotationSampler")
    .setInput(times)
    .setOutput(rotationAccessor)
    .setInterpolation("LINEAR")

  const rotationChannel = doc.createAnimationChannel("rotationChannel")
    .setTargetNode(joints[0])
    .setTargetPath("rotation")
    .setSampler(rotationSampler)

  doc.createAnimation("animation")
    .addChannel(positionChannel)
    .addSampler(positionSampler)
    .addChannel(rotationChannel)
    .addSampler(rotationSampler)

  const container = doc.createNode("container")
  container.addChild(polygon)
  container.addChild(joints[0])
  doc.createScene().addChild(container)

  const io = new NodeIO()
  io.write("polygon.glb", doc)
}

main()