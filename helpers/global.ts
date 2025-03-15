function ObtainCurrentDate()
{
    return new Date().toISOString().slice(0, 23).replace('T', ' ');
}

export { ObtainCurrentDate };