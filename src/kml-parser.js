const fs = require('fs');
const xml2js = require('xml2js');

async function parseKml(filePath) {
  try {
    const xmlData = fs.readFileSync(filePath, 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);

    const placemarks = result.kml?.Document?.[0]?.Placemark || [];
    const clients = [];

    placemarks.forEach((pm) => {
      const name = pm.name?.[0];
      if (!name) return;

      let lat, lon, city, enseigne;

      // Extraire les ExtendedData
      const extendedData = pm.ExtendedData?.[0]?.Data || [];
      extendedData.forEach((data) => {
        const dataName = data.$.name;
        const value = data.value?.[0];

        if (dataName === 'lat') lat = parseFloat(value);
        else if (dataName === 'lon') lon = parseFloat(value);
        else if (dataName === 'city') city = value;
        else if (dataName === 'Enseigne') enseigne = value;
      });

      if (lat && lon) {
        clients.push({
          id: `client-${clients.length + 1}`,
          name,
          city: city || 'Unknown',
          lat,
          lon,
          type: 'client',
          enseigne: enseigne || 'N/A'
        });
      }
    });

    return clients;
  } catch (error) {
    console.error('Erreur parsing KML:', error);
    throw error;
  }
}

module.exports = parseKml;
