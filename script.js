
document.addEventListener("DOMContentLoaded", () => {

    /* MOBILE NAVIGATION */

    const mobileToggle = document.querySelector(".mobile-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("active");
            mobileToggle.setAttribute("aria-expanded", String(isOpen));
            mobileToggle.textContent = isOpen ? "×" : "☰";
        });

        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("active");
                mobileToggle.setAttribute("aria-expanded", "false");
                mobileToggle.textContent = "☰";
            });
        });
    }


    /* LIFT CHAPTER MAP */

    const mapElement = document.getElementById("lift-world-map");
    if (!mapElement) return;

    const countrySelect = document.getElementById("chapter-country");
    const chapterForm = document.getElementById("chapter-form");
    const overlay = document.getElementById("chapter-form-overlay");
    const openFormButton = document.getElementById("open-chapter-form");
    const closeFormButton = document.getElementById("close-chapter-form");
    const loadingMessage = document.getElementById("map-loading-message");

    const STORAGE_KEY = "lift-chapter-pins";

    const savedChapters = () => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    };

    let chapters = savedChapters();
    let map;
    let countryFeatures = [];
    let countryLayers = [];

    /* Open and close the form */

    openFormButton?.addEventListener("click", () => {
        overlay.hidden = false;
    });

    closeFormButton?.addEventListener("click", () => {
        overlay.hidden = true;
    });

    overlay?.addEventListener("click", event => {
        if (event.target === overlay) overlay.hidden = true;
    });


    /* Load Leaflet map library */

    if (typeof L === "undefined") {
        loadingMessage.textContent = "The map library could not be loaded.";
        return;
    }

    map = L.map(mapElement, {
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 1,
        maxZoom: 6,
        worldCopyJump: true
    }).setView([20, 0], 2);

    /*
       This is a vector map made from country boundaries.
       There is deliberately NO Google, CARTO or tile layer.
    */

    const countryDataURL =
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

    fetch(countryDataURL)
        .then(response => {
            if (!response.ok) throw new Error("Could not load country data.");
            return response.json();
        })
        .then(data => {

            countryFeatures = data.features.filter(feature => {
                const properties = feature.properties || {};
                const name = (
                    properties.ADMIN ||
                    properties.name ||
                    properties.NAME ||
                    ""
                ).toLowerCase();

                const code = (
                    properties.ISO_A3 ||
                    properties.iso_a3 ||
                    ""
                ).toUpperCase();

                return name !== "antarctica" && code !== "ATA";
            });

            const countriesLayer = L.geoJSON(
                {
                    type: "FeatureCollection",
                    features: countryFeatures
                },
                {
                    style: {
                        color: "#FFFFFF",
                        weight: 0.8,
                        fillColor: "#DCE5DF",
                        fillOpacity: 1
                    }
                }
            ).addTo(map);

            countryLayers = countriesLayer.getLayers();

            map.fitBounds(countriesLayer.getBounds(), {
                padding: [10, 10]
            });

            populateCountrySelect();
            drawSavedChapters();

            loadingMessage.style.display = "none";
        })
        .catch(error => {
            console.error(error);
            loadingMessage.textContent =
                "The world map could not load. Please check your internet connection.";
        });


    /* Fill country list, excluding Antarctica */

    function populateCountrySelect() {
        const countries = countryFeatures
            .map(feature => {
                const properties = feature.properties || {};

                return (
                    properties.ADMIN ||
                    properties.name ||
                    properties.NAME ||
                    ""
                );
            })
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        countries.forEach(country => {
            if (country.toLowerCase() === "antarctica") return;

            const option = document.createElement("option");
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }


    /* Find approximate center of selected country */

    function findCountryCenter(countryName) {
        const feature = countryFeatures.find(feature => {
            const properties = feature.properties || {};
            const name =
                properties.ADMIN ||
                properties.name ||
                properties.NAME ||
                "";

            return name.toLowerCase() === countryName.toLowerCase();
        });

        if (!feature) return null;

        const bounds = L.geoJSON(feature).getBounds();

        if (!bounds.isValid()) return null;

        return bounds.getCenter();
    }


    /* Draw all saved chapter pins */

    function drawSavedChapters() {
        chapters.forEach(chapter => {
            const position = findCountryCenter(chapter.country);

            if (!position) return;

            const marker = L.circleMarker(position, {
                radius: 7,
                color: "#FFFFFF",
                weight: 2,
                fillColor: "#E54848",
                fillOpacity: 1
            }).addTo(map);

            const popupContent = document.createElement("div");
            popupContent.className = "chapter-popup";

            const title = document.createElement("strong");
            title.textContent = chapter.name;

            const location = document.createElement("p");
            location.textContent = `${chapter.city}, ${chapter.country}`;

            popupContent.append(title, location);
            marker.bindPopup(popupContent);
        });
    }


    /* Add a new chapter */

    chapterForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("chapter-name").value.trim();
        const country = countrySelect.value;
        const city = document.getElementById("chapter-city").value.trim();

        if (!name || !country || !city) {
            alert("Please complete all fields.");
            return;
        }

        if (country.toLowerCase() === "antarctica") {
            alert("Antarctica cannot be added as a LIFT chapter location.");
            return;
        }

        const position = findCountryCenter(country);

        if (!position) {
            alert("Please select a valid country.");
            return;
        }

        const duplicate = chapters.some(chapter =>
            chapter.name.toLowerCase() === name.toLowerCase() &&
            chapter.country.toLowerCase() === country.toLowerCase() &&
            chapter.city.toLowerCase() === city.toLowerCase()
        );

        if (duplicate) {
            alert("This chapter has already been added.");
            return;
        }

        const newChapter = { name, country, city };

        chapters.push(newChapter);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));

        const marker = L.circleMarker(position, {
            radius: 7,
            color: "#FFFFFF",
            weight: 2,
            fillColor: "#E54848",
            fillOpacity: 1
        }).addTo(map);

        const popupContent = document.createElement("div");
        popupContent.className = "chapter-popup";

        const title = document.createElement("strong");
        title.textContent = name;

        const location = document.createElement("p");
        location.textContent = `${city}, ${country}`;

        popupContent.append(title, location);
        marker.bindPopup(popupContent).openPopup();

        chapterForm.reset();
        overlay.hidden = true;
    });

});
