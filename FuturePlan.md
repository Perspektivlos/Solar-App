# Bereits implementiert (Erledigt)
---------------------------------
- [x] **Live MQTT-Sniffer & Diagnose-Terminal**: Integriert in 'MQTT & APIs' mit Echtzeit-Traffic-Stream, Wildcard-Filtern (`#`, `+`), Message Inspector und interaktivem Publish-Terminal für Steuerbefehle an Trucki, VenusOS und AhoyDTU.
- [x] **Recharts Energie- & Phasen-Verlauf**: 24h, 12h, 6h, 3h Zeithorizonte, umschaltbare Kurven für PV, Akku, Netz, Hauslast sowie eine tägliche kWh-Energiebilanz.

# Hardware-Diagnose Modul
------------------------
Füge einen neuen Reiter 'Hardware-Diagnose' hinzu, der basierend auf den Gerätedaten den Status der Proxmox-Infrastruktur, Ping-Latenz-Statistiken der Geräte und lokale Systemtemperatur-Graphen visualisiert.


# Dark-Mode Umschalter
------------------------
Implementiere einen globalen 'Dark/Light'-Theme-Umschalter mit persistentem State in der Navbar, der die Farbschemata für die Glaseffekte und Hintergründe in index.css dynamisch anpasst.


# Diagram-Export als PDF
------------------------
Füge einen Button zur EnergyAnalytics-Komponente hinzu, der den aktuellen Graph als hochauflösendes PNG oder PDF exportiert.


# Kwh Prognose Indikator
------------------------
Erweitere die Energiebilanz-Anzeige um einen Indikator für die prognostizierte kWh-Erzeugung für den restlichen Tag basierend auf den aktuellen Wetter-API-Daten.


# Command Terminal
------------------------
Add a 'Publish Terminal' to the MQTT & APIs view that allows sending structured JSON control commands to specific topics for Trucki, VenusOS, and AhoyDTU, complete with a history of last sent commands.