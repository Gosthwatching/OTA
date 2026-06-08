ENLEVER NIVEAU DE CHARGEMENT ET SA LOGIQUE
ENLEVER LE MENU DEROULANT EN HAUT
FAIRE UN LOGO POUR LE SITE
AMELIORER LE CSS 


FAIRE FACADE ATLANTIQUE par département
Logique Point activé ou non

*


https://www.qsl.net/f1lpt/

https://www.scaleway.com/en/blog/meet-fr-par-3/
58 boulevard Lefebvre
PARIS
FR
75015

https://www.opcore.com/

https://journeesdupatrimoine.culture.gouv.fr/w/377623/evenement/18723415/visite-de-labri-anti-aerien-de-bois-colombes#/events/18723415

,\n\n{
,\n\n\t\t{







import re

with open("demo.txt") as f:
  for line in f:
  	# On cherche l'id Bunker
    resultBunkerID = re.search("B/F-[0-9]{4}", line)
    bunkerID = line[resultBunkerID.start():resultBunkerID.end()]
    # print(bunkerID)

    # On cherche la Latitude
    resultLat = re.search(" -?[0-9]{1,2}[.,][0-9]{4,} ", line)
    bunkerLat = line[resultLat.start():resultLat.end()]
    # print(bunkerLat)

    # On récupère le nom du Bunker
    nomBunker = line[resultBunkerID.end():resultLat.start()]

    # On récupère le QTH locator
    # [A-X]{2}[0-9]{2}[A-X]{2}
    resultQTH = re.search("[A-X]{2}[0-9]{2}[A-X]{2}", line)
    bunkerQTH = line[resultQTH.start():resultQTH.end()]
    # print(bunkerQTH)

    # On cherche la Longitude
    bunkerLong = line[resultLat.end():resultQTH.start()-1]

    print(bunkerID + ",'" + nomBunker + "'," + bunkerLat + "," + bunkerLong + ", " + bunkerQTH + ", ")

f.close()