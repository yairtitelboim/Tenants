import pandas as pd
import os

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Read the CSV file
df = pd.read_csv(os.path.join(current_dir, 'combined_data.csv'), dtype=object)

# Count unique building IDs
unique_building_count = df['building_id'].nunique()
print(f"Total number of unique buildings in the dataset: {unique_building_count}")

# Get the counts of events for each building ID
building_id_counts = df['building_id'].value_counts()

print("\nNumber of events per building ID:")
for building_id, count in building_id_counts.items():
    print(f"Building ID: {building_id}, Events: {count}")

print("\nTop 10 buildings by number of events:")
print(building_id_counts.head(10))

print("\nBottom 10 buildings by number of events:")
print(building_id_counts.tail(10))

# Tenant analysis
if 'tenant' in df.columns:
    print("\nTenant analysis:")
    tenant_counts = df['tenant'].value_counts()
    unique_tenant_count = len(tenant_counts)
    print(f"Number of unique tenants: {unique_tenant_count}")
    
    print("\nTop 10 most common tenants:")
    print(tenant_counts.head(10))
    
    # Calculate percentage of total for top 10 tenants
    total_rows = len(df)
    top_10_percentages = (tenant_counts.head(10) / total_rows * 100).round(2)
    print("\nPercentage of total for top 10 tenants:")
    print(top_10_percentages)
    
    print("\nBottom 10 tenants by number of events:")
    print(tenant_counts.tail(10))

    # Additional tenant analysis
    print("\nTenant distribution:")
    tenant_event_counts = tenant_counts.value_counts().sort_index()
    print(tenant_event_counts)

    print("\nTenants with more than 100 events:")
    significant_tenants = tenant_counts[tenant_counts > 100]
    print(f"Number of tenants with more than 100 events: {len(significant_tenants)}")

    print("\nDistribution of tenant event counts:")
    bins = [0, 10, 100, 1000, 10000, float('inf')]
    labels = ['1-10', '11-100', '101-1000', '1001-10000', '10000+']
    tenant_distribution = pd.cut(tenant_counts, bins=bins, labels=labels, include_lowest=True)
    print(tenant_distribution.value_counts().sort_index())

else:
    print("\n'tenant' column not found in the dataset")

# Calculate the number of events without tenant information
events_without_tenant = df['tenant'].isnull().sum()
percentage_without_tenant = (events_without_tenant / total_rows * 100).round(2)
print(f"\nNumber of events without tenant information: {events_without_tenant}")
print(f"Percentage of events without tenant information: {percentage_without_tenant}%")

# Calculate the number of events with tenant information
events_with_tenant = total_rows - events_without_tenant
percentage_with_tenant = (events_with_tenant / total_rows * 100).round(2)
print(f"\nNumber of events with tenant information: {events_with_tenant}")
print(f"Percentage of events with tenant information: {percentage_with_tenant}%")