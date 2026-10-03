/**
 * Bekannte Wörter für automatische Hinweise beim Abstimmen.
 * Kein Wort wird automatisch abgelehnt: Fehlt es hier, entscheiden die Spieler.
 */

// Deutsche, österreichische und Schweizer Städte sowie bekannte Städte weltweit
export const CITIES = `
Aachen Aalen Ahlen Altenburg Amberg Ansbach Arnsberg Aschaffenburg Augsburg Aurich
Bad Homburg Bad Kreuznach Bad Oeynhausen Bad Salzuflen Baden-Baden Bamberg Bautzen Bayreuth Bergisch Gladbach Berlin Bielefeld Bocholt Bochum Bonn Bottrop Brandenburg Braunschweig Bremen Bremerhaven Bruchsal
Celle Chemnitz Coburg Cottbus Cuxhaven
Darmstadt Delmenhorst Dessau Detmold Dinslaken Dormagen Dorsten Dortmund Dresden Duisburg Düren Düsseldorf
Eisenach Emden Erfurt Erlangen Eschweiler Essen Esslingen Euskirchen
Flensburg Frankfurt Freiburg Friedrichshafen Fulda Fürth
Garbsen Gelsenkirchen Gera Gießen Gladbeck Göppingen Görlitz Goslar Gotha Göttingen Greifswald Gütersloh
Hagen Halle Hamburg Hameln Hamm Hanau Hannover Heidelberg Heilbronn Herford Herne Hildesheim Hof Hürth
Ingolstadt Iserlohn
Jena
Kaiserslautern Karlsruhe Kassel Kempten Kiel Koblenz Köln Konstanz Krefeld
Landshut Langenfeld Leipzig Leverkusen Lingen Lippstadt Lübeck Lüdenscheid Ludwigsburg Ludwigshafen Lüneburg
Magdeburg Mainz Mannheim Marburg Marl Meerbusch Memmingen Minden Moers Mönchengladbach Mülheim München Münster
Neubrandenburg Neumünster Neuss Neuwied Norderstedt Nordhorn Nürnberg
Oberhausen Offenbach Offenburg Oldenburg Osnabrück
Paderborn Passau Peine Pforzheim Plauen Potsdam
Ratingen Recklinghausen Regensburg Remscheid Reutlingen Rheine Rosenheim Rostock
Saarbrücken Salzgitter Schweinfurt Schwerin Siegen Sindelfingen Solingen Speyer Stade Stralsund Stuttgart Suhl
Trier Tübingen
Ulm Unna
Velbert Viersen Villingen-Schwenningen
Weimar Wesel Wetzlar Wiesbaden Wilhelmshaven Witten Wolfenbüttel Wolfsburg Worms Wuppertal Würzburg
Zwickau
Graz Innsbruck Klagenfurt Linz Salzburg Villach Wien Wels
Basel Bern Biel Genf Lausanne Lugano Luzern St. Gallen Winterthur Zürich
Amsterdam Antwerpen Athen Barcelona Belgrad Bergen Bilbao Birmingham Bordeaux Bratislava Brügge Brüssel Budapest Bukarest Danzig Dublin Edinburgh Florenz Glasgow Göteborg Granada Den Haag Helsinki Istanbul Kiew Kopenhagen Krakau Lissabon Liverpool London Luxemburg Lyon Madrid Mailand Malaga Manchester Marseille Minsk Moskau Neapel Nizza Oslo Palermo Paris Porto Prag Reykjavik Riga Rom Rotterdam Sankt Petersburg Sevilla Sofia Stockholm Straßburg Tallinn Toulouse Turin Valencia Venedig Vilnius Warschau Zagreb
Abu Dhabi Accra Addis Abeba Alexandria Algier Ankara Atlanta Bagdad Bangkok Barcelona Beirut Bogotá Boston Brasília Buenos Aires Kairo Kapstadt Caracas Casablanca Chicago Dakar Dallas Damaskus Delhi Denver Detroit Doha Dubai Durban Havanna Hanoi Helsinki Hongkong Houston Jakarta Jerusalem Johannesburg Kabul Kalkutta Karatschi Kathmandu Kingston Kyoto Lagos Las Vegas Lima Los Angeles Manila Melbourne Mexiko-Stadt Miami Montreal Mumbai Nairobi New York Osaka Ottawa Peking Perth Philadelphia Phoenix Quebec Quito Rio de Janeiro Riad San Diego San Francisco Santiago Sao Paulo Seattle Seoul Shanghai Singapur Sydney Taipeh Teheran Tel Aviv Tokio Toronto Tunis Vancouver Washington Wellington
`;

// Mehrwortige Städtenamen, die oben per Leerzeichen getrennt wären
export const CITIES_MULTI = [
  "Bad Homburg", "Bad Kreuznach", "Bad Oeynhausen", "Bad Salzuflen", "Bergisch Gladbach", "St. Gallen", "Den Haag",
  "Sankt Petersburg", "Abu Dhabi", "Addis Abeba", "Buenos Aires", "Las Vegas", "Los Angeles", "New York",
  "Rio de Janeiro", "San Diego", "San Francisco", "Sao Paulo", "Tel Aviv", "Frankfurt am Main", "Frankfurt an der Oder",
  "Freiburg im Breisgau", "Halle (Saale)", "Mülheim an der Ruhr", "Offenbach am Main", "Ludwigshafen am Rhein",
];

// Flüsse in Deutschland und bekannte Flüsse weltweit
export const RIVERS = `
Aller Altmühl Ammer Bode Donau Elbe Ems Eder Elster Fulda Havel Iller Ilm Ilmenau Inn Isar Jagst Kinzig Kocher Lahn Lech Leine Lippe Main Mosel Mulde Naab Nahe Neckar Neiße Oder Oker Peene Regen Regnitz Rhein Ruhr Saale Saar Salzach Sieg Spree Tauber Unstrut Weser Werra Wertach Wupper
Aare Drau Enns Etsch Garonne Loire Maas Mur Po Rhône Schelde Seine Shannon Tajo Themse Tiber Ebro Duero Dnjepr Dnister Don Düna Memel Weichsel Wolga Ural Save Theiß Morava Moldau Marne Mosel
Amazonas Amur Brahmaputra Colorado Euphrat Ganges Gelber Fluss Indus Irrawaddy Jangtsekiang Jangtse Jenissei Jordan Kongo Lena Mackenzie Mekong Mississippi Missouri Murray Niger Nil Ob Orinoco Paraná Rio Grande Sambesi Sankt-Lorenz-Strom Tigris Yukon
`;

export const RIVERS_MULTI = ["Gelber Fluss", "Rio Grande", "Weiße Elster", "Schwarze Elster", "Fränkische Saale"];

export function splitList(raw: string, multi: string[]): string[] {
  let rest = raw;
  for (const m of multi) rest = rest.split(m).join(" ");
  const single = rest.split(/\s+/).map((w) => w.trim()).filter(Boolean);
  return [...single, ...multi];
}
