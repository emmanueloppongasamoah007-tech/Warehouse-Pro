package com.propro.warehouse.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.propro.warehouse.model.Aisle;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.model.Zone;
import com.propro.warehouse.repository.AisleRepository;
import com.propro.warehouse.repository.BinLocationRepository;
import com.propro.warehouse.repository.ZoneRepository;

/**
 * Seeds a small sample warehouse layout on startup so /api/routes/optimize
 * has real data to work against. Runs only against the in-memory H2 DB
 * (application.properties), so this resets every time the app restarts -
 * that's intentional for local dev/testing.
 *
 * Layout: one zone with 3 aisles, each aisle has a few bins along it,
 * plus a single "PACK-01" bin representing the packing station.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final ZoneRepository zoneRepository;
    private final AisleRepository aisleRepository;
    private final BinLocationRepository binLocationRepository;

    public DataSeeder(ZoneRepository zoneRepository,
                       AisleRepository aisleRepository,
                       BinLocationRepository binLocationRepository) {
        this.zoneRepository = zoneRepository;
        this.aisleRepository = aisleRepository;
        this.binLocationRepository = binLocationRepository;
    }

    @Override
    public void run(String... args) {
        Zone pickingZone = new Zone("Picking Zone A", "PICKING");
        zoneRepository.save(pickingZone);

        // Packing station - the fixed start/end point for every route
        BinLocation packStation = new BinLocation("PACK-01", 0, 0);
        binLocationRepository.save(packStation);

        // Aisle 1 - vertical, positioned at x = 10
        Aisle aisle1 = new Aisle("A1", Aisle.Orientation.VERTICAL, 1, 0, 40);
        aisle1.setZone(pickingZone);
        aisleRepository.save(aisle1);
        saveBin("A1-B01", 10, 5, aisle1);
        saveBin("A1-B02", 10, 15, aisle1);
        saveBin("A1-B03", 10, 25, aisle1);
        saveBin("A1-B04", 10, 35, aisle1);

        // Aisle 2 - vertical, positioned at x = 20
        Aisle aisle2 = new Aisle("A2", Aisle.Orientation.VERTICAL, 2, 0, 40);
        aisle2.setZone(pickingZone);
        aisleRepository.save(aisle2);
        saveBin("A2-B01", 20, 5, aisle2);
        saveBin("A2-B02", 20, 15, aisle2);
        saveBin("A2-B03", 20, 25, aisle2);
        saveBin("A2-B04", 20, 35, aisle2);

        // Aisle 3 - vertical, positioned at x = 30
        Aisle aisle3 = new Aisle("A3", Aisle.Orientation.VERTICAL, 3, 0, 40);
        aisle3.setZone(pickingZone);
        aisleRepository.save(aisle3);
        saveBin("A3-B01", 30, 5, aisle3);
        saveBin("A3-B02", 30, 15, aisle3);
        saveBin("A3-B03", 30, 25, aisle3);
        saveBin("A3-B04", 30, 35, aisle3);

        System.out.println("=== Sample warehouse data seeded ===");
        System.out.println("Try: POST /api/routes/optimize");
        System.out.println("{ \"startCode\": \"PACK-01\", \"pickListCodes\": [\"A1-B03\", \"A2-B01\", \"A3-B04\", \"A1-B01\"] }");
    }

    private void saveBin(String code, double x, double y, Aisle aisle) {
        BinLocation bin = new BinLocation(code, x, y);
        bin.setAisle(aisle);
        binLocationRepository.save(bin);
    }
}
