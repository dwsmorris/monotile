
export default point3 => ([point1, point2]) => {
    // Calculate vectors
    const vector1 = [point1[0] - point2[0], point1[1] - point2[1]];
    const vector2 = [point3[0] - point2[0], point3[1] - point2[1]];

    // Calculate dot product
    const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];

    // Calculate cross product
    const crossProduct = vector1[0] * vector2[1] - vector1[1] * vector2[0];

    // Calculate angle in radians
    let angleInRadians = Math.atan2(crossProduct, dotProduct);

    // Convert the angle to degrees
    const angleInDegrees = angleInRadians * (180 / Math.PI);

    return angleInDegrees > 0;
};