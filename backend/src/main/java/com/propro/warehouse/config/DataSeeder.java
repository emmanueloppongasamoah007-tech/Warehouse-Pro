package com.propro.warehouse.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

import com.propro.warehouse.model.Aisle;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.model.Order;
import com.propro.warehouse.model.Warehouse;
import com.propro.warehouse.model.Zone;
import com.propro.warehouse.repository.AisleRepository;
import com.propro.warehouse.repository.BinLocationRepository;
import com.propro.warehouse.repository.OrderRepository;
import com.propro.warehouse.repository.WarehouseRepository;
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
    private final OrderRepository orderRepository;
    private final WarehouseRepository warehouseRepository;

    public DataSeeder(ZoneRepository zoneRepository,
                       AisleRepository aisleRepository,
                       BinLocationRepository binLocationRepository,
                       OrderRepository orderRepository,
                       WarehouseRepository warehouseRepository) {
        this.zoneRepository = zoneRepository;
        this.aisleRepository = aisleRepository;
        this.binLocationRepository = binLocationRepository;
        this.orderRepository = orderRepository;
        this.warehouseRepository = warehouseRepository;
    }

    @Override
    public void run(String... args) {
        if (zoneRepository.count() > 0) {
            System.out.println("=== Data already exists - skipping sample seed ===");
            return;
        }
        
        Zone pickingZone = new Zone("Picking Zone A", "PICKING");
        zoneRepository.save(pickingZone);

        // Floor dimensions in the same units as bin x/y. Sized with headroom
        // past the furthest seeded bin (x = 30, y = 35) so an admin can add
        // stock beyond the sample layout without resizing first.
        warehouseRepository.save(new Warehouse("Main Warehouse", 40, 45));

        // Packing station - the fixed start/end point for every route
        BinLocation packStation = new BinLocation("PACK-01", 0, 0);
        binLocationRepository.save(packStation);

        // Aisle 1 - vertical, positioned at x = 10
        Aisle aisle1 = new Aisle("A1", Aisle.Orientation.VERTICAL, 1, 0, 40);
        aisle1.setZone(pickingZone);
        aisleRepository.save(aisle1);
        saveBin("A1-B01", 10, 5, aisle1, "Bluetooth Headphones");
        saveBin("A1-B02", 10, 15, aisle1, "USB-C Cable 2m");
        saveBin("A1-B03", 10, 25, aisle1, "Wireless Mouse");
        saveBin("A1-B04", 10, 35, aisle1, "Laptop Stand");

        // Aisle 2 - vertical, positioned at x = 20
        Aisle aisle2 = new Aisle("A2", Aisle.Orientation.VERTICAL, 2, 0, 40);
        aisle2.setZone(pickingZone);
        aisleRepository.save(aisle2);
        saveBin("A2-B01", 20, 5, aisle2, "Notebook - A5");
        saveBin("A2-B02", 20, 15, aisle2, "Ballpoint Pens (10pk)");
        saveBin("A2-B03", 20, 25, aisle2, "Sticky Notes");
        saveBin("A2-B04", 20, 35, aisle2, "Document Folders");

        // Aisle 3 - vertical, positioned at x = 30
        Aisle aisle3 = new Aisle("A3", Aisle.Orientation.VERTICAL, 3, 0, 40);
        aisle3.setZone(pickingZone);
        aisleRepository.save(aisle3);
        saveBin("A3-B01", 30, 5, aisle3, "Desk Lamp");
        saveBin("A3-B02", 30, 15, aisle3, "Power Strip 6-way");
        saveBin("A3-B03", 30, 25, aisle3, "Monitor Riser");
        saveBin("A3-B04", 30, 35, aisle3, "Cable Ties (100pk)");

        // Sample pick orders. Every code below is one of the bins seeded above,
        // and each list is deliberately out of walking order so the route
        // optimizer has something to actually reorder.
        seedOrder("PACK-01", List.of("A1-B03", "A2-B01", "A3-B04", "A1-B01"));
        seedOrder("PACK-01", List.of("A3-B01", "A1-B02", "A2-B04"));
        seedOrder("PACK-01", List.of("A2-B02", "A2-B03", "A1-B04", "A3-B02", "A3-B03"));
        seedOrder("PACK-01", List.of("A1-B01", "A3-B01"));

        System.out.println("=== Sample warehouse data seeded ===");
        System.out.println("Try: POST /api/routes/optimize");
        System.out.println("{ \"startCode\": \"PACK-01\", \"pickListCodes\": [\"A1-B03\", \"A2-B01\", \"A3-B04\", \"A1-B01\"] }");
        System.out.println("Try: GET /api/orders  (" + orderRepository.count() + " sample orders)");
        System.out.println("Try: GET /api/warehouse  (floor dimensions)");
    }

    private void seedOrder(String startCode, List<String> pickListCodes) {
        orderRepository.save(new Order(startCode, pickListCodes));
    }

    private void saveBin(String code, double x, double y, Aisle aisle, String sku) {
        BinLocation bin = new BinLocation(code, x, y);
        bin.setSku(sku);
        bin.setAisle(aisle);
        binLocationRepository.save(bin);
    }
}
