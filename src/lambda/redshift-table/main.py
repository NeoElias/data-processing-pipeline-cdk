import psycopg2
import boto3

ssm = boto3.client('ssm')
lambdafn = boto3.client('lambda')

def lambda_handler(event, context):
    host = ssm.get_parameter(Name="/redshift/cluster/endpoint")['Parameter']['Value']
    port = ssm.get_parameter(Name="/redshift/cluster/port")['Parameter']['Value']
    user = ssm.get_parameter(Name="/redshift/cluster/dbuser")['Parameter']['Value']
    password = ssm.get_parameter(Name="/redshift/cluster/dbpassword")['Parameter']['Value']
    dbname = ssm.get_parameter(Name="/redshift/cluster/dbname")['Parameter']['Value']

    try:
        print("Trying to connect")
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password
        )

        print("Trying to create table")
        table_name = 'testdata'

        create_table_query = ''' 
            CREATE TABLE testdata (
                id INTEGER PRIMARY KEY,
                firstname VARCHAR(255),
                lastname VARCHAR(255),
                age INTEGER
            ) 
        '''

        with conn.cursor() as cur:
            cur.execute(f"SELECT EXISTS(SELECT * FROM information_schema.tables WHERE table_name='{table_name}')")
            table_exists = cur.fetchone()[0]
            print(table_exists)

            if not table_exists:
                print('Attempting to create table')
                cur.execute(create_table_query)
                print('Executed!')
                conn.commit()
            cur.close() 
        conn.close()
        print('Successfully created Redshift table')
        lambdafn.delete_function(FunctionName = context.function_name)

    except Exception as e:
        print('Error creating Redshift table:', e)

